import "server-only";

import pg from "pg";
import { databaseUrl } from "@/lib/config";

/**
 * Pool PostgreSQL partagé par l'identité et les données de jeu.
 *
 * Le pool est mémorisé sur `globalThis` : Next recharge les modules à chaud en
 * développement, et un pool par rechargement épuiserait les connexions.
 * Sur Vercel (serverless), chaque instance garde son pool : la chaîne de
 * connexion doit être une chaîne *pooled* (PgBouncer, Neon, Supabase).
 */

type PgPool = import("pg").Pool;

declare global {
  // eslint-disable-next-line no-var
  var __adeuxPgPool: PgPool | undefined;
}

// `bigint` est renvoyé en chaîne par défaut. Nos horodatages (ms) et nos
// compteurs tiennent largement dans un `number` sûr.
pg.types.setTypeParser(20, (value: string) => Number(value));

export function hasDatabase(): boolean {
  return databaseUrl() !== null;
}

export function getPool(): PgPool {
  const connectionString = databaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL absent : base de données indisponible.");
  }

  if (!globalThis.__adeuxPgPool) {
    globalThis.__adeuxPgPool = new pg.Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }

  return globalThis.__adeuxPgPool;
}

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Exécute plusieurs instructions dans une transaction unique. */
export async function withTransaction<T>(
  handler: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
