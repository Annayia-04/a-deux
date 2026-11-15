-- 005 — Passerelle d'authentification native
--
-- Google OAuth ne peut pas s'exécuter dans la WebView de l'application.
-- Le flux navigateur renvoie vers l'app un code opaque, à usage unique et de
-- courte durée, que la WebView échange contre sa session. Seul le hash du code
-- est stocké.

CREATE TABLE IF NOT EXISTS auth_handoffs (
  code_hash  text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  expires_at bigint NOT NULL,
  used_at    bigint
);

CREATE INDEX IF NOT EXISTS auth_handoffs_expires_idx
  ON auth_handoffs (expires_at);
