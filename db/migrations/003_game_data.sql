-- 003 — Données de jeu dans PostgreSQL
--
-- Objectif : héberger l'application sur Vercel, où le système de fichiers est
-- éphémère. Les tables métier quittent SQLite et rejoignent PostgreSQL.
--
-- Les identifiants restent des TEXT générés par l'application (hash de jeton
-- de session, identifiant de duo, de souvenir) : aucune donnée existante n'est
-- réinterprétée. Les horodatages restent des BIGINT en millisecondes Unix,
-- comme dans le modèle applicatif.
--
-- Les tables `couples` et `couple_members` de `001_accounts.sql` n'ont jamais
-- été utilisées (l'application s'appuyait sur SQLite) : elles sont remplacées
-- par le modèle ci-dessous, identique à celui de SQLite.

DROP TABLE IF EXISTS couple_members;
DROP TABLE IF EXISTS couples;

CREATE TABLE IF NOT EXISTS sessions (
  id           text PRIMARY KEY,
  prefs        text NOT NULL,
  seed         text NOT NULL,
  created_at   bigint NOT NULL,
  last_seen_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_created_idx ON sessions (created_at);

CREATE TABLE IF NOT EXISTS session_aliases (
  alias_id   text PRIMARY KEY,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id    text,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS session_aliases_session_idx
  ON session_aliases (session_id);

CREATE INDEX IF NOT EXISTS session_aliases_user_idx
  ON session_aliases (user_id);

CREATE TABLE IF NOT EXISTS widget_devices (
  token_hash   text PRIMARY KEY,
  session_id   text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label        text,
  created_at   bigint NOT NULL,
  last_used_at bigint,
  revoked_at   bigint
);

CREATE INDEX IF NOT EXISTS widget_devices_session_idx
  ON widget_devices (session_id);

CREATE TABLE IF NOT EXISTS swipes (
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  idea_id    text NOT NULL,
  direction  text NOT NULL CHECK (direction IN ('like', 'pass')),
  created_at bigint NOT NULL,
  PRIMARY KEY (session_id, idea_id)
);

CREATE INDEX IF NOT EXISTS swipes_session_created_idx
  ON swipes (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS swipes_idea_idx
  ON swipes (idea_id, direction);

CREATE TABLE IF NOT EXISTS couples (
  id         text PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS couple_members (
  couple_id  text NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  joined_at  bigint NOT NULL,
  PRIMARY KEY (couple_id, session_id)
);

CREATE INDEX IF NOT EXISTS couple_members_couple_idx
  ON couple_members (couple_id);

CREATE TABLE IF NOT EXISTS matches (
  couple_id  text NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  idea_id    text NOT NULL,
  created_at bigint NOT NULL,
  PRIMARY KEY (couple_id, idea_id)
);

CREATE INDEX IF NOT EXISTS matches_couple_created_idx
  ON matches (couple_id, created_at DESC);

CREATE TABLE IF NOT EXISTS match_views (
  couple_id  text NOT NULL,
  idea_id    text NOT NULL,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  viewed_at  bigint NOT NULL,
  PRIMARY KEY (couple_id, idea_id, session_id),
  FOREIGN KEY (couple_id, idea_id)
    REFERENCES matches(couple_id, idea_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS souvenirs (
  id          text PRIMARY KEY,
  couple_id   text NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  idea_id     text,
  title       text NOT NULL,
  emoji       text NOT NULL,
  happened_at bigint NOT NULL,
  created_by  text REFERENCES sessions(id) ON DELETE SET NULL,
  created_at  bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS souvenirs_couple_idx
  ON souvenirs (couple_id, happened_at DESC, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS souvenirs_couple_idea_uniq
  ON souvenirs (couple_id, idea_id)
  WHERE idea_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS souvenir_notes (
  souvenir_id text NOT NULL REFERENCES souvenirs(id) ON DELETE CASCADE,
  session_id  text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  bigint NOT NULL,
  updated_at  bigint NOT NULL,
  PRIMARY KEY (souvenir_id, session_id)
);

CREATE TABLE IF NOT EXISTS choice_swipes (
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  category   text NOT NULL CHECK (category IN ('food', 'movie')),
  choice_id  text NOT NULL,
  direction  text NOT NULL CHECK (direction IN ('like', 'pass')),
  created_at bigint NOT NULL,
  PRIMARY KEY (session_id, category, choice_id)
);

CREATE INDEX IF NOT EXISTS choice_swipes_choice_idx
  ON choice_swipes (category, choice_id, direction);

CREATE INDEX IF NOT EXISTS choice_swipes_session_idx
  ON choice_swipes (session_id, category, created_at DESC);

CREATE TABLE IF NOT EXISTS choice_matches (
  couple_id  text NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  category   text NOT NULL CHECK (category IN ('food', 'movie')),
  choice_id  text NOT NULL,
  created_at bigint NOT NULL,
  PRIMARY KEY (couple_id, category, choice_id)
);

CREATE INDEX IF NOT EXISTS choice_matches_couple_idx
  ON choice_matches (couple_id, created_at DESC);

CREATE TABLE IF NOT EXISTS choice_match_views (
  couple_id  text NOT NULL,
  category   text NOT NULL,
  choice_id  text NOT NULL,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  viewed_at  bigint NOT NULL,
  PRIMARY KEY (couple_id, category, choice_id, session_id),
  FOREIGN KEY (couple_id, category, choice_id)
    REFERENCES choice_matches(couple_id, category, choice_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS taps (
  id           bigserial PRIMARY KEY,
  couple_id    text NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  from_session text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at   bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS taps_couple_idx
  ON taps (couple_id, id DESC);

CREATE TABLE IF NOT EXISTS tap_reads (
  couple_id   text NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  session_id  text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  last_tap_id bigint NOT NULL,
  PRIMARY KEY (couple_id, session_id)
);
