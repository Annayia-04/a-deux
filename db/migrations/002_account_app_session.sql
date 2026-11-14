-- 002 — Rattachement d'un compte à l'espace de données

-- Session applicative canonique détenue par le compte. Les autres appareils
-- s'y rattachent par un alias (table SQLite `session_aliases`) sans dupliquer
-- les données. Un compte ne peut posséder qu'une session canonique.
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_session_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS users_app_session_uniq
  ON users (app_session_id)
  WHERE app_session_id IS NOT NULL;
