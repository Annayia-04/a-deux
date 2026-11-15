-- 006 — Appareils de notification push
--
-- Jeton FCM opaque par appareil, rattaché à la session canonique. Le jeton
-- ne permet pas d'accéder aux données : il sert uniquement à recevoir les
-- notifications du duo.

CREATE TABLE IF NOT EXISTS push_devices (
  token       text PRIMARY KEY,
  session_id  text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  platform    text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  created_at  bigint NOT NULL,
  last_used_at bigint
);

CREATE INDEX IF NOT EXISTS push_devices_session_idx
  ON push_devices (session_id);
