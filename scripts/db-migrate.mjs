/**
 * Applique les migrations SQL de `db/migrations` sur la base Postgres.
 *
 * Usage :
 *   node scripts/db-migrate.mjs            # applique les migrations manquantes
 *   node scripts/db-migrate.mjs --status   # affiche l'état sans rien modifier
 *
 * La chaîne `DATABASE_URL_DIRECT` est prioritaire : les migrations ne doivent
 * pas passer par un pooler de type PgBouncer.
 */
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "db", "migrations");
const LOCK_KEY = 72_839_401n;
const STATUS_ONLY = process.argv.includes("--status");

// Même résolution que Next : `.env.local`, `.env`, variables d'environnement.
loadEnvConfig(ROOT);

const connectionString =
  process.env.DATABASE_URL_DIRECT?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error(
    "DATABASE_URL_DIRECT ou DATABASE_URL est requis pour appliquer les migrations.",
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString });

function checksum(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function listMigrations() {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
}

async function main() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await client.query(
    "SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name",
  );
  const applied = new Map(rows.map((row) => [row.name, row]));

  const files = await listMigrations();
  if (files.length === 0) {
    console.log("Aucune migration trouvée.");
    return;
  }

  if (STATUS_ONLY) {
    for (const file of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const row = applied.get(file);
      if (!row) {
        console.log(`○ ${file} — à appliquer`);
      } else if (row.checksum !== checksum(sql)) {
        console.log(`! ${file} — appliquée mais modifiée depuis`);
      } else {
        console.log(`✓ ${file} — ${row.applied_at.toISOString()}`);
      }
    }
    for (const name of applied.keys()) {
      if (!files.includes(name)) {
        console.log(`? ${name} — appliquée mais absente du dossier`);
      }
    }
    return;
  }

  await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
  try {
    for (const file of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const digest = checksum(sql);
      const row = applied.get(file);

      if (row) {
        if (row.checksum !== digest) {
          throw new Error(
            `${file} a été modifiée après application : créer une nouvelle migration plutôt que réécrire l’histoire.`,
          );
        }
        console.log(`✓ ${file} — déjà appliquée`);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [file, digest],
        );
        await client.query("COMMIT");
        console.log(`+ ${file} — appliquée`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
  }
}

main()
  .then(() => client.end())
  .catch(async (error) => {
    console.error("Échec des migrations :", error.message);
    await client.end().catch(() => {});
    process.exit(1);
  });
