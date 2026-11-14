import pg from "pg";
import { databaseUrl } from "@/lib/config";

/**
 * Accès PostgreSQL pour l'identité uniquement.
 *
 * Les données de jeu (swipes, duos, souvenirs) restent dans SQLite pour
 * l'instant : la session applicative canonique est identifiée par son hash,
 * et Postgres ne stocke que le lien compte → session. La migration complète
 * des données est décrite dans `docs/architecture-comptes-postgres.md`.
 *
 * Le pool est créé paresseusement et mémorisé sur `globalThis` pour survivre
 * au rechargement à chaud de Next en développement.
 */

type PgPool = import("pg").Pool;

declare global {
  // eslint-disable-next-line no-var
  var __adeuxPgPool: PgPool | undefined;
}

export type AccountUser = {
  id: string;
  displayName: string | null;
  email: string | null;
  appSessionId: string | null;
};

export type GoogleIdentityInput = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

function getPool(): PgPool {
  const connectionString = databaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL absent : comptes indisponibles.");
  }

  if (!globalThis.__adeuxPgPool) {
    // `serverExternalPackages` garde `pg` hors du bundle client.
    globalThis.__adeuxPgPool = new pg.Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }

  return globalThis.__adeuxPgPool;
}

export function isAccountStoreReady(): boolean {
  return databaseUrl() !== null;
}

function toUser(row: {
  id: string;
  display_name: string | null;
  email: string | null;
  app_session_id: string | null;
}): AccountUser {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    appSessionId: row.app_session_id,
  };
}

const USER_COLUMNS = "id, display_name, email, app_session_id";

/**
 * Crée ou retrouve l'utilisateur lié à une identité Google.
 * L'opération est transactionnelle et tolère une course sur la contrainte
 * unique `(provider, subject)` : dans ce cas on relit l'identité gagnante.
 */
export async function upsertGoogleUser(
  identity: GoogleIdentityInput,
): Promise<AccountUser> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query<{ user_id: string }>(
      "SELECT user_id FROM auth_identities WHERE provider = 'google' AND subject = $1",
      [identity.subject],
    );

    if (existing.rows[0]) {
      const userId = existing.rows[0].user_id;
      await client.query(
        `UPDATE auth_identities
            SET last_login_at = now(),
                email = COALESCE($2, email),
                email_verified = email_verified OR $3
          WHERE provider = 'google' AND subject = $1`,
        [identity.subject, identity.email, identity.emailVerified],
      );
      if (identity.name) {
        await client.query(
          `UPDATE users
              SET display_name = COALESCE(display_name, $2), updated_at = now()
            WHERE id = $1`,
          [userId, identity.name],
        );
      }
      const user = await client.query(
        `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
        [userId],
      );
      await client.query("COMMIT");
      return toUser(user.rows[0]);
    }

    const created = await client.query<{ id: string }>(
      `INSERT INTO users (display_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      [identity.name, identity.email],
    );
    const userId = created.rows[0]!.id;

    await client.query(
      `INSERT INTO auth_identities
         (user_id, provider, subject, email, email_verified, last_login_at)
       VALUES ($1, 'google', $2, $3, $4, now())`,
      [userId, identity.subject, identity.email, identity.emailVerified],
    );

    const user = await client.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [userId],
    );
    await client.query("COMMIT");
    return toUser(user.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    // Course entre deux connexions simultanées : l'identité existe déjà.
    if ((error as { code?: string }).code === "23505") {
      const row = await pool.query<{ user_id: string }>(
        "SELECT user_id FROM auth_identities WHERE provider = 'google' AND subject = $1",
        [identity.subject],
      );
      if (row.rows[0]) {
        const user = await pool.query(
          `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
          [row.rows[0].user_id],
        );
        return toUser(user.rows[0]);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export type StoredAuthSession = AccountUser & {
  expiresAt: Date;
};

/** Enregistre un jeton de compte (seul son SHA-256 est stocké). */
export async function createAuthSession(
  userId: string,
  tokenHashHex: string,
  ttlMs: number,
): Promise<void> {
  await getPool().query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + ($3 || ' milliseconds')::interval)`,
    [Buffer.from(tokenHashHex, "hex"), userId, String(ttlMs)],
  );
}

export async function readAuthSession(
  tokenHashHex: string,
): Promise<StoredAuthSession | null> {
  const result = await getPool().query(
    `SELECT u.id, u.display_name, u.email, u.app_session_id, s.expires_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()`,
    [Buffer.from(tokenHashHex, "hex")],
  );

  const row = result.rows[0];
  if (!row) return null;

  await getPool()
    .query(
      "UPDATE auth_sessions SET last_seen_at = now() WHERE token_hash = $1",
      [Buffer.from(tokenHashHex, "hex")],
    )
    .catch(() => {});

  return { ...toUser(row), expiresAt: row.expires_at };
}

export async function revokeAuthSession(tokenHashHex: string): Promise<void> {
  await getPool().query(
    "UPDATE auth_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [Buffer.from(tokenHashHex, "hex")],
  );
}

/** Rattache une session applicative à un compte, si aucune n'est déjà liée. */
export async function claimAppSession(
  userId: string,
  appSessionId: string,
): Promise<AccountUser> {
  const result = await getPool().query(
    `UPDATE users
        SET app_session_id = $2, updated_at = now()
      WHERE id = $1 AND app_session_id IS NULL
      RETURNING ${USER_COLUMNS}`,
    [userId, appSessionId],
  );

  if (result.rows[0]) return toUser(result.rows[0]);

  const current = await getPool().query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [userId],
  );
  return toUser(current.rows[0]);
}

/** Remplace la session canonique (nouvelle sélection créée hors session). */
export async function setAppSession(
  userId: string,
  appSessionId: string | null,
): Promise<void> {
  await getPool().query(
    "UPDATE users SET app_session_id = $2, updated_at = now() WHERE id = $1",
    [userId, appSessionId],
  );
}

export async function findUserByAppSession(
  appSessionId: string,
): Promise<AccountUser | null> {
  const result = await getPool().query(
    `SELECT ${USER_COLUMNS} FROM users WHERE app_session_id = $1`,
    [appSessionId],
  );
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

/** Purge opportuniste des sessions de compte expirées. */
export async function deleteExpiredAuthSessions(): Promise<void> {
  await getPool()
    .query(
      "DELETE FROM auth_sessions WHERE expires_at < now() - interval '7 days'",
    )
    .catch(() => {});
}
