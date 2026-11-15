import { createHash, randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/pg-pool";

/**
 * Code de passage entre le navigateur système (Google OAuth) et la WebView.
 * Il ne contient aucune donnée : seul son SHA-256 est stocké, il expire en
 * deux minutes et ne peut être utilisé qu'une fois.
 */

const HANDOFF_TTL_MS = 2 * 60 * 1000;

function hash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function createAuthHandoff(userId: string): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  const now = Date.now();

  await query(
    `INSERT INTO auth_handoffs (code_hash, user_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [hash(code), userId, now, now + HANDOFF_TTL_MS],
  );

  // Purge opportuniste des codes expirés.
  await query("DELETE FROM auth_handoffs WHERE expires_at < $1", [
    now - 60 * 60 * 1000,
  ]).catch(() => undefined);

  return code;
}

/** Consomme le code atomiquement ; renvoie l'utilisateur ou null. */
export async function consumeAuthHandoff(code: string): Promise<string | null> {
  const row = await queryOne<{ userId: string }>(
    `UPDATE auth_handoffs
        SET used_at = $2
      WHERE code_hash = $1
        AND used_at IS NULL
        AND expires_at > $2
      RETURNING user_id AS "userId"`,
    [hash(code), Date.now()],
  );
  return row?.userId ?? null;
}
