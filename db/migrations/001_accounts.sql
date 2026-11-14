-- 001 — Comptes, identités et sessions
--
-- Cible PostgreSQL. Les tables métier (swipes, matchs, souvenirs, choix,
-- taps) rejoindront cette base dans une migration ultérieure, quand la couche
-- de dépôts sera branchée : on ne mélange pas schéma d'identité et données
-- applicatives dans la même étape.
--
-- `gen_random_uuid()` est natif depuis PostgreSQL 13 : aucune extension.
-- Le schéma est idempotent (IF NOT EXISTS) pour pouvoir être rejoué sans
-- risque sur une base existante.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 80),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       text NOT NULL CHECK (provider IN ('google', 'apple')),
  subject        text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 255),
  email          text CHECK (email IS NULL OR char_length(email) <= 320),
  email_verified boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz,
  UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS auth_identities_user_idx
  ON auth_identities (user_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  -- SHA-256 du jeton opaque : la valeur du cookie n'est jamais stockée.
  token_hash      bytea PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  user_agent_hash bytea,
  ip_hash         bytea
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_active_idx
  ON auth_sessions (user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  -- SHA-256 du cookie anonyme existant.
  id           text PRIMARY KEY,
  prefs        jsonb NOT NULL,
  seed         text NOT NULL,
  claimed_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  claimed_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anonymous_sessions_claimed_idx
  ON anonymous_sessions (claimed_by)
  WHERE claimed_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS couples (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE CHECK (char_length(code) = 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at  timestamptz
);

CREATE TABLE IF NOT EXISTS couple_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  anon_id    text REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  -- Un membre est soit un compte, soit une session anonyme, jamais les deux.
  CHECK ((user_id IS NULL) <> (anon_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS couple_members_user_uniq
  ON couple_members (user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS couple_members_anon_uniq
  ON couple_members (anon_id)
  WHERE anon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS couple_members_couple_idx
  ON couple_members (couple_id);
