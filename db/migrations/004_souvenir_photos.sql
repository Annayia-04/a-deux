-- 004 — Photos des souvenirs
--
-- Les images sont stockées dans PostgreSQL (bytea) : pas de disque persistant
-- sur Vercel, et l'accès passe uniquement par une route authentifiée. Les
-- photos sont donc privées par construction : aucune URL publique devinable.
--
-- Les fichiers sont compressés côté client (JPEG, 1600 px max) et revalidés
-- côté serveur (type réel, taille, quota).

CREATE TABLE IF NOT EXISTS souvenir_photos (
  id          text PRIMARY KEY,
  souvenir_id text NOT NULL REFERENCES souvenirs(id) ON DELETE CASCADE,
  session_id  text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  mime        text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size   integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 4194304),
  data        bytea NOT NULL,
  created_at  bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS souvenir_photos_souvenir_idx
  ON souvenir_photos (souvenir_id, created_at);

CREATE INDEX IF NOT EXISTS souvenir_photos_created_idx
  ON souvenir_photos (created_at DESC);
