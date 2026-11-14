import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ChoiceCategory, Prefs, SwipeDirection } from "@/lib/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "date-swipe.db");

export type SessionRecord = {
  id: string;
  prefs: string;
  seed: string;
  createdAt: number;
  lastSeenAt: number;
};

export type SwipeRecord = {
  ideaId: string;
  direction: SwipeDirection;
  createdAt: number;
};

export type CoupleRecord = {
  id: string;
  code: string;
  createdAt: number;
};

export type MembershipRecord = CoupleRecord & {
  sessionId: string;
  joinedAt: number;
};

export type MatchRecord = {
  ideaId: string;
  createdAt: number;
  seen: number;
};

export type SouvenirRecord = {
  id: string;
  ideaId: string | null;
  title: string;
  emoji: string;
  happenedAt: number;
  createdAt: number;
  createdBy: string | null;
};

export type SouvenirNoteRecord = {
  souvenirId: string;
  sessionId: string;
  body: string;
  updatedAt: number;
};

export type ChoiceMatchRecord = {
  category: ChoiceCategory;
  choiceId: string;
  createdAt: number;
  seen: number;
};

export type TapRecord = {
  id: number;
  createdAt: number;
};

export type JoinResult =
  | "joined"
  | "already-member"
  | "full"
  | "other-couple";

export type LeaveResult = {
  coupleId: string;
  coupleDeleted: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __dateSwipeDb: Database.Database | undefined;
}

function openDatabase(): Database.Database {
  mkdirSync(DATA_DIR, { recursive: true });

  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  database.pragma("synchronous = NORMAL");

  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      prefs TEXT NOT NULL,
      seed TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS swipes (
      session_id TEXT NOT NULL,
      idea_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
      created_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, idea_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS swipes_session_created_idx
      ON swipes (session_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS swipes_idea_idx
      ON swipes (idea_id, direction);

    /* Un espace à deux, identifié par un code d'invitation à 6 caractères. */
    CREATE TABLE IF NOT EXISTS couples (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    /* Un membre = une session anonyme. Maximum deux par couple (contrôlé en code). */
    CREATE TABLE IF NOT EXISTS couple_members (
      couple_id TEXT NOT NULL,
      session_id TEXT NOT NULL UNIQUE,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (couple_id, session_id),
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS couple_members_couple_idx
      ON couple_members (couple_id);

    /* Matchs mutuels matérialisés pour conserver une date et un état « vu ». */
    CREATE TABLE IF NOT EXISTS matches (
      couple_id TEXT NOT NULL,
      idea_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (couple_id, idea_id),
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS matches_couple_created_idx
      ON matches (couple_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS match_views (
      couple_id TEXT NOT NULL,
      idea_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      viewed_at INTEGER NOT NULL,
      PRIMARY KEY (couple_id, idea_id, session_id),
      FOREIGN KEY (couple_id, idea_id)
        REFERENCES matches(couple_id, idea_id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    /* Journal de souvenirs : un date vécu, raconté par chaque membre. */
    CREATE TABLE IF NOT EXISTS souvenirs (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL,
      idea_id TEXT,
      title TEXT NOT NULL,
      emoji TEXT NOT NULL,
      happened_at INTEGER NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES sessions(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS souvenirs_couple_idx
      ON souvenirs (couple_id, happened_at DESC, created_at DESC);

    CREATE TABLE IF NOT EXISTS souvenir_notes (
      souvenir_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (souvenir_id, session_id),
      FOREIGN KEY (souvenir_id) REFERENCES souvenirs(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    /* Choix Nourriture / Films : swipes personnels puis matchs de couple. */
    CREATE TABLE IF NOT EXISTS choice_swipes (
      session_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('food', 'movie')),
      choice_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
      created_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, category, choice_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS choice_swipes_choice_idx
      ON choice_swipes (category, choice_id, direction);

    CREATE INDEX IF NOT EXISTS choice_swipes_session_idx
      ON choice_swipes (session_id, category, created_at DESC);

    CREATE TABLE IF NOT EXISTS choice_matches (
      couple_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('food', 'movie')),
      choice_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (couple_id, category, choice_id),
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS choice_matches_couple_idx
      ON choice_matches (couple_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS choice_match_views (
      couple_id TEXT NOT NULL,
      category TEXT NOT NULL,
      choice_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      viewed_at INTEGER NOT NULL,
      PRIMARY KEY (couple_id, category, choice_id, session_id),
      FOREIGN KEY (couple_id, category, choice_id)
        REFERENCES choice_matches(couple_id, category, choice_id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    /* Pensées rapides : un tap est un petit événement de couple. */
    CREATE TABLE IF NOT EXISTS taps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      couple_id TEXT NOT NULL,
      from_session TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
      FOREIGN KEY (from_session) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS taps_couple_idx
      ON taps (couple_id, id DESC);

    CREATE TABLE IF NOT EXISTS tap_reads (
      couple_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      last_tap_id INTEGER NOT NULL,
      PRIMARY KEY (couple_id, session_id),
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  return database;
}

/** Singleton : une seule connexion par processus, y compris sous HMR. */
export function getDb(): Database.Database {
  if (!globalThis.__dateSwipeDb) {
    globalThis.__dateSwipeDb = openDatabase();
  }
  return globalThis.__dateSwipeDb;
}

const statementCache = new Map<string, Database.Statement>();

function statement(sql: string): Database.Statement {
  let cached = statementCache.get(sql);
  if (!cached) {
    cached = getDb().prepare(sql);
    statementCache.set(sql, cached);
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Sessions et swipes
// ---------------------------------------------------------------------------

export function createSessionRecord(
  id: string,
  prefs: Prefs,
  seed: string,
  now: number = Date.now(),
): void {
  statement(
    `INSERT INTO sessions (id, prefs, seed, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, JSON.stringify(prefs), seed, now, now);
}

/**
 * Remplace la sélection d'une session existante sans changer son identifiant.
 * L'appartenance à un espace à deux et les matchs déjà obtenus sont conservés.
 */
export function resetSessionRecord(
  id: string,
  prefs: Prefs,
  seed: string,
  now: number = Date.now(),
): void {
  const reset = getDb().transaction(() => {
    statement(`DELETE FROM swipes WHERE session_id = ?`).run(id);
    statement(
      `UPDATE sessions SET prefs = ?, seed = ?, last_seen_at = ? WHERE id = ?`,
    ).run(JSON.stringify(prefs), seed, now, id);
  });
  reset();
}

export function getSessionRecord(id: string): SessionRecord | null {
  const row = statement(
    `SELECT id, prefs, seed, created_at AS createdAt, last_seen_at AS lastSeenAt
     FROM sessions WHERE id = ?`,
  ).get(id) as SessionRecord | undefined;
  return row ?? null;
}

export function touchSession(id: string, now: number = Date.now()): void {
  statement(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`).run(now, id);
}

export function deleteSessionRecord(id: string): void {
  statement(`DELETE FROM sessions WHERE id = ?`).run(id);
  cleanupOrphanCouples();
}

export function deleteExpiredSessions(ttlMs: number, now: number = Date.now()): void {
  statement(`DELETE FROM sessions WHERE created_at < ?`).run(now - ttlMs);
  cleanupOrphanCouples();
}

export function addSwipe(
  sessionId: string,
  ideaId: string,
  direction: SwipeDirection,
  now: number = Date.now(),
): void {
  statement(
    `INSERT INTO swipes (session_id, idea_id, direction, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (session_id, idea_id)
     DO UPDATE SET direction = excluded.direction, created_at = excluded.created_at`,
  ).run(sessionId, ideaId, direction, now);
}

export function listSwipes(sessionId: string): SwipeRecord[] {
  return statement(
    `SELECT idea_id AS ideaId, direction, created_at AS createdAt
     FROM swipes
     WHERE session_id = ?
     ORDER BY created_at DESC, rowid DESC`,
  ).all(sessionId) as SwipeRecord[];
}

export function countSwipes(sessionId: string): number {
  const row = statement(
    `SELECT COUNT(*) AS total FROM swipes WHERE session_id = ?`,
  ).get(sessionId) as { total: number };
  return row.total;
}

/** Annule le dernier swipe et renvoie l'idée restaurée (transactionnel). */
export function undoLastSwipe(sessionId: string): string | null {
  const undo = getDb().transaction((id: string): string | null => {
    const row = statement(
      `SELECT idea_id AS ideaId FROM swipes
       WHERE session_id = ?
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    ).get(id) as { ideaId: string } | undefined;

    if (!row) return null;
    statement(`DELETE FROM swipes WHERE session_id = ? AND idea_id = ?`).run(
      id,
      row.ideaId,
    );
    return row.ideaId;
  });

  return undo(sessionId);
}

// ---------------------------------------------------------------------------
// Espaces à deux
// ---------------------------------------------------------------------------

export function createCoupleRecord(
  id: string,
  code: string,
  sessionId: string,
  now: number = Date.now(),
): void {
  const create = getDb().transaction(() => {
    statement(
      `INSERT INTO couples (id, code, created_at) VALUES (?, ?, ?)`,
    ).run(id, code, now);
    statement(
      `INSERT INTO couple_members (couple_id, session_id, joined_at)
       VALUES (?, ?, ?)`,
    ).run(id, sessionId, now);
  });
  create();
}

export function getMembershipBySession(
  sessionId: string,
): MembershipRecord | null {
  const row = statement(
    `SELECT c.id, c.code, c.created_at AS createdAt,
            m.session_id AS sessionId, m.joined_at AS joinedAt
     FROM couple_members m
     JOIN couples c ON c.id = m.couple_id
     WHERE m.session_id = ?`,
  ).get(sessionId) as MembershipRecord | undefined;
  return row ?? null;
}

export function getCoupleByCode(code: string): CoupleRecord | null {
  const row = statement(
    `SELECT id, code, created_at AS createdAt FROM couples WHERE code = ?`,
  ).get(code) as CoupleRecord | undefined;
  return row ?? null;
}

export function countCoupleMembers(coupleId: string): number {
  const row = statement(
    `SELECT COUNT(*) AS total FROM couple_members WHERE couple_id = ?`,
  ).get(coupleId) as { total: number };
  return row.total;
}

export function joinCoupleRecord(
  coupleId: string,
  sessionId: string,
  now: number = Date.now(),
): JoinResult {
  const join = getDb().transaction((): JoinResult => {
    const existing = getMembershipBySession(sessionId);
    if (existing) {
      return existing.id === coupleId ? "already-member" : "other-couple";
    }

    // Revérifié dans la transaction pour éviter deux arrivées simultanées.
    if (countCoupleMembers(coupleId) >= 2) return "full";

    statement(
      `INSERT INTO couple_members (couple_id, session_id, joined_at)
       VALUES (?, ?, ?)`,
    ).run(coupleId, sessionId, now);

    return "joined";
  });

  return join();
}

export function leaveCoupleRecord(sessionId: string): LeaveResult | null {
  const leave = getDb().transaction((): LeaveResult | null => {
    const membership = getMembershipBySession(sessionId);
    if (!membership) return null;

    statement(`DELETE FROM couple_members WHERE session_id = ?`).run(sessionId);
    // Le duo est rompu : les contenus partagés appartiennent aux deux membres.
    statement(`DELETE FROM matches WHERE couple_id = ?`).run(membership.id);
    statement(`DELETE FROM souvenir_notes WHERE souvenir_id IN (
      SELECT id FROM souvenirs WHERE couple_id = ?
    )`).run(membership.id);
    statement(`DELETE FROM souvenirs WHERE couple_id = ?`).run(membership.id);
    statement(`DELETE FROM choice_match_views WHERE couple_id = ?`).run(
      membership.id,
    );
    statement(`DELETE FROM choice_matches WHERE couple_id = ?`).run(
      membership.id,
    );
    statement(`DELETE FROM tap_reads WHERE couple_id = ?`).run(membership.id);
    statement(`DELETE FROM taps WHERE couple_id = ?`).run(membership.id);

    const remaining = countCoupleMembers(membership.id);
    if (remaining === 0) {
      statement(`DELETE FROM couples WHERE id = ?`).run(membership.id);
    }

    return { coupleId: membership.id, coupleDeleted: remaining === 0 };
  });

  return leave();
}

/** Supprime les couples qui n'ont plus aucun membre (session expirée, etc.). */
export function cleanupOrphanCouples(): void {
  statement(
    `DELETE FROM couples
     WHERE id NOT IN (SELECT DISTINCT couple_id FROM couple_members)`,
  ).run();
}

// ---------------------------------------------------------------------------
// Matchs mutuels
// ---------------------------------------------------------------------------

export function hasMutualLike(coupleId: string, ideaId: string): boolean {
  const row = statement(
    `SELECT COUNT(DISTINCT s.session_id) AS total
     FROM swipes s
     JOIN couple_members m ON m.session_id = s.session_id
     WHERE m.couple_id = ? AND s.idea_id = ? AND s.direction = 'like'`,
  ).get(coupleId, ideaId) as { total: number };
  return row.total >= 2;
}

export function listMutualLikeIdeaIds(coupleId: string): string[] {
  return statement(
    `SELECT s.idea_id AS ideaId
     FROM swipes s
     JOIN couple_members m ON m.session_id = s.session_id
     WHERE m.couple_id = ? AND s.direction = 'like'
     GROUP BY s.idea_id
     HAVING COUNT(DISTINCT s.session_id) >= 2`,
  ).all(coupleId).map((row) => (row as { ideaId: string }).ideaId);
}

/** Insère un match s'il vient d'être créé. Renvoie true pour la nouveauté. */
export function insertMatchRecord(
  coupleId: string,
  ideaId: string,
  now: number = Date.now(),
): boolean {
  const result = statement(
    `INSERT OR IGNORE INTO matches (couple_id, idea_id, created_at)
     VALUES (?, ?, ?)`,
  ).run(coupleId, ideaId, now);
  return result.changes > 0;
}

export function deleteMatchRecord(coupleId: string, ideaId: string): void {
  statement(`DELETE FROM matches WHERE couple_id = ? AND idea_id = ?`).run(
    coupleId,
    ideaId,
  );
}

export function listMatchRecords(
  coupleId: string,
  sessionId: string,
): MatchRecord[] {
  return statement(
    `SELECT m.idea_id AS ideaId, m.created_at AS createdAt,
            CASE WHEN v.session_id IS NULL THEN 0 ELSE 1 END AS seen
     FROM matches m
     LEFT JOIN match_views v
       ON v.couple_id = m.couple_id
      AND v.idea_id = m.idea_id
      AND v.session_id = ?
     WHERE m.couple_id = ?
     ORDER BY m.created_at DESC, m.rowid DESC`,
  ).all(sessionId, coupleId) as MatchRecord[];
}

export function markMatchViewed(
  coupleId: string,
  ideaId: string,
  sessionId: string,
  now: number = Date.now(),
): void {
  statement(
    `INSERT OR IGNORE INTO match_views
       (couple_id, idea_id, session_id, viewed_at)
     VALUES (?, ?, ?, ?)`,
  ).run(coupleId, ideaId, sessionId, now);
}

export function markAllMatchesViewed(
  coupleId: string,
  sessionId: string,
  now: number = Date.now(),
): void {
  statement(
    `INSERT OR IGNORE INTO match_views
       (couple_id, idea_id, session_id, viewed_at)
     SELECT couple_id, idea_id, ?, ? FROM matches WHERE couple_id = ?`,
  ).run(sessionId, now, coupleId);
}

/**
 * Remet les matchs en phase avec les likes réellement présents.
 * Utilisé au démarrage d'un duo, après une annulation ou un changement de sélection.
 */
export function reconcileCoupleMatches(
  coupleId: string,
  now: number = Date.now(),
): void {
  const reconcile = getDb().transaction(() => {
    const mutual = new Set(listMutualLikeIdeaIds(coupleId));
    const existing = statement(
      `SELECT idea_id AS ideaId FROM matches WHERE couple_id = ?`,
    )
      .all(coupleId)
      .map((row) => (row as { ideaId: string }).ideaId);

    const existingSet = new Set(existing);
    for (const ideaId of existing) {
      if (!mutual.has(ideaId)) deleteMatchRecord(coupleId, ideaId);
    }
    for (const ideaId of mutual) {
      if (!existingSet.has(ideaId)) insertMatchRecord(coupleId, ideaId, now);
    }
  });
  reconcile();
}

export function deleteMatchIfNotMutual(
  coupleId: string,
  ideaId: string,
): void {
  if (!hasMutualLike(coupleId, ideaId)) {
    deleteMatchRecord(coupleId, ideaId);
  }
}

// ---------------------------------------------------------------------------
// Souvenirs
// ---------------------------------------------------------------------------

export function createSouvenirRecord(input: {
  id: string;
  coupleId: string;
  ideaId: string | null;
  title: string;
  emoji: string;
  happenedAt: number;
  createdBy: string;
  body: string | null;
  now?: number;
}): void {
  const now = input.now ?? Date.now();
  const create = getDb().transaction(() => {
    statement(
      `INSERT INTO souvenirs
         (id, couple_id, idea_id, title, emoji, happened_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.id,
      input.coupleId,
      input.ideaId,
      input.title,
      input.emoji,
      input.happenedAt,
      input.createdBy,
      now,
    );

    if (input.body) {
      statement(
        `INSERT INTO souvenir_notes
           (souvenir_id, session_id, body, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(input.id, input.createdBy, input.body, now, now);
    }
  });
  create();
}

export function listSouvenirRecords(coupleId: string): SouvenirRecord[] {
  return statement(
    `SELECT id, idea_id AS ideaId, title, emoji,
            happened_at AS happenedAt, created_at AS createdAt,
            created_by AS createdBy
     FROM souvenirs
     WHERE couple_id = ?
     ORDER BY happened_at DESC, created_at DESC, rowid DESC`,
  ).all(coupleId) as SouvenirRecord[];
}

export function getSouvenirCoupleId(souvenirId: string): string | null {
  const row = statement(
    `SELECT couple_id AS coupleId FROM souvenirs WHERE id = ?`,
  ).get(souvenirId) as { coupleId: string } | undefined;
  return row?.coupleId ?? null;
}

export function listSouvenirNotes(coupleId: string): SouvenirNoteRecord[] {
  return statement(
    `SELECT n.souvenir_id AS souvenirId, n.session_id AS sessionId,
            n.body, n.updated_at AS updatedAt
     FROM souvenir_notes n
     JOIN souvenirs s ON s.id = n.souvenir_id
     WHERE s.couple_id = ?
     ORDER BY n.updated_at ASC`,
  ).all(coupleId) as SouvenirNoteRecord[];
}

export function upsertSouvenirNote(
  souvenirId: string,
  sessionId: string,
  body: string,
  now: number = Date.now(),
): void {
  statement(
    `INSERT INTO souvenir_notes
       (souvenir_id, session_id, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (souvenir_id, session_id)
     DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
  ).run(souvenirId, sessionId, body, now, now);
}

// ---------------------------------------------------------------------------
// Choix Nourriture / Films
// ---------------------------------------------------------------------------

export function addChoiceSwipe(
  sessionId: string,
  category: ChoiceCategory,
  choiceId: string,
  direction: SwipeDirection,
  now: number = Date.now(),
): void {
  statement(
    `INSERT INTO choice_swipes
       (session_id, category, choice_id, direction, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (session_id, category, choice_id)
     DO UPDATE SET direction = excluded.direction, created_at = excluded.created_at`,
  ).run(sessionId, category, choiceId, direction, now);
}

export function listChoiceSwipes(
  sessionId: string,
  category: ChoiceCategory,
): { choiceId: string; direction: SwipeDirection }[] {
  return statement(
    `SELECT choice_id AS choiceId, direction
     FROM choice_swipes
     WHERE session_id = ? AND category = ?
     ORDER BY created_at DESC, rowid DESC`,
  ).all(sessionId, category) as {
    choiceId: string;
    direction: SwipeDirection;
  }[];
}

export function hasMutualChoiceLike(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
): boolean {
  const row = statement(
    `SELECT COUNT(DISTINCT s.session_id) AS total
     FROM choice_swipes s
     JOIN couple_members m ON m.session_id = s.session_id
     WHERE m.couple_id = ? AND s.category = ? AND s.choice_id = ?
       AND s.direction = 'like'`,
  ).get(coupleId, category, choiceId) as { total: number };
  return row.total >= 2;
}

export function listMutualChoiceKeys(
  coupleId: string,
): { category: ChoiceCategory; choiceId: string }[] {
  return statement(
    `SELECT s.category, s.choice_id AS choiceId
     FROM choice_swipes s
     JOIN couple_members m ON m.session_id = s.session_id
     WHERE m.couple_id = ? AND s.direction = 'like'
     GROUP BY s.category, s.choice_id
     HAVING COUNT(DISTINCT s.session_id) >= 2`,
  ).all(coupleId) as { category: ChoiceCategory; choiceId: string }[];
}

export function insertChoiceMatchRecord(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
  now: number = Date.now(),
): boolean {
  const result = statement(
    `INSERT OR IGNORE INTO choice_matches (couple_id, category, choice_id, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(coupleId, category, choiceId, now);
  return result.changes > 0;
}

export function deleteChoiceMatchRecord(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
): void {
  statement(
    `DELETE FROM choice_matches
     WHERE couple_id = ? AND category = ? AND choice_id = ?`,
  ).run(coupleId, category, choiceId);
}

export function listChoiceMatchRecords(
  coupleId: string,
  sessionId: string,
  category: ChoiceCategory | null = null,
): ChoiceMatchRecord[] {
  return statement(
    `SELECT m.category, m.choice_id AS choiceId, m.created_at AS createdAt,
            CASE WHEN v.session_id IS NULL THEN 0 ELSE 1 END AS seen
     FROM choice_matches m
     LEFT JOIN choice_match_views v
       ON v.couple_id = m.couple_id
      AND v.category = m.category
      AND v.choice_id = m.choice_id
      AND v.session_id = ?
     WHERE m.couple_id = ? AND (? IS NULL OR m.category = ?)
     ORDER BY m.created_at DESC, m.rowid DESC`,
  ).all(sessionId, coupleId, category, category) as ChoiceMatchRecord[];
}

export function markChoiceMatchViewed(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
  sessionId: string,
  now: number = Date.now(),
): void {
  statement(
    `INSERT OR IGNORE INTO choice_match_views
       (couple_id, category, choice_id, session_id, viewed_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(coupleId, category, choiceId, sessionId, now);
}

export function markAllChoiceMatchesViewed(
  coupleId: string,
  category: ChoiceCategory,
  sessionId: string,
  now: number = Date.now(),
): void {
  statement(
    `INSERT OR IGNORE INTO choice_match_views
       (couple_id, category, choice_id, session_id, viewed_at)
     SELECT couple_id, category, choice_id, ?, ?
     FROM choice_matches
     WHERE couple_id = ? AND category = ?`,
  ).run(sessionId, now, coupleId, category);
}

export function deleteChoiceMatchIfNotMutual(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
): void {
  if (!hasMutualChoiceLike(coupleId, category, choiceId)) {
    deleteChoiceMatchRecord(coupleId, category, choiceId);
  }
}

/** Réaligne les matchs de choix après une arrivée ou un changement de duo. */
export function reconcileChoiceMatches(
  coupleId: string,
  now: number = Date.now(),
): void {
  const reconcile = getDb().transaction(() => {
    const mutual = new Set(
      listMutualChoiceKeys(coupleId).map(
        (key) => `${key.category}:${key.choiceId}`,
      ),
    );
    const existing = statement(
      `SELECT category, choice_id AS choiceId FROM choice_matches WHERE couple_id = ?`,
    )
      .all(coupleId)
      .map((row) => {
        const record = row as { category: ChoiceCategory; choiceId: string };
        return { ...record, key: `${record.category}:${record.choiceId}` };
      });

    const existingKeys = new Set(existing.map((row) => row.key));
    for (const row of existing) {
      if (!mutual.has(row.key)) {
        deleteChoiceMatchRecord(coupleId, row.category, row.choiceId);
      }
    }
    for (const key of mutual) {
      if (existingKeys.has(key)) continue;
      const separator = key.indexOf(":");
      const category = key.slice(0, separator) as ChoiceCategory;
      const choiceId = key.slice(separator + 1);
      insertChoiceMatchRecord(coupleId, category, choiceId, now);
    }
  });
  reconcile();
}

export function markAllChoiceMatchesSeen(
  coupleId: string,
  sessionId: string,
  now: number = Date.now(),
): void {
  statement(
    `INSERT OR IGNORE INTO choice_match_views
       (couple_id, category, choice_id, session_id, viewed_at)
     SELECT couple_id, category, choice_id, ?, ?
     FROM choice_matches WHERE couple_id = ?`,
  ).run(sessionId, now, coupleId);
}

// ---------------------------------------------------------------------------
// Taps
// ---------------------------------------------------------------------------

export function insertTapRecord(
  coupleId: string,
  fromSession: string,
  now: number = Date.now(),
): number {
  const result = statement(
    `INSERT INTO taps (couple_id, from_session, created_at) VALUES (?, ?, ?)`,
  ).run(coupleId, fromSession, now);
  return Number(result.lastInsertRowid);
}

export function getTapReadCursor(
  coupleId: string,
  sessionId: string,
): number {
  const row = statement(
    `SELECT last_tap_id AS lastTapId FROM tap_reads
     WHERE couple_id = ? AND session_id = ?`,
  ).get(coupleId, sessionId) as { lastTapId: number } | undefined;
  return row?.lastTapId ?? 0;
}

export function listPartnerTapsAfter(
  coupleId: string,
  sessionId: string,
  afterId: number,
): TapRecord[] {
  return statement(
    `SELECT id, created_at AS createdAt
     FROM taps
     WHERE couple_id = ? AND from_session <> ? AND id > ?
     ORDER BY id DESC
     LIMIT 20`,
  ).all(coupleId, sessionId, afterId) as TapRecord[];
}

export function getLatestPartnerTapId(
  coupleId: string,
  sessionId: string,
): number {
  const row = statement(
    `SELECT MAX(id) AS latest FROM taps
     WHERE couple_id = ? AND from_session <> ?`,
  ).get(coupleId, sessionId) as { latest: number | null };
  return row.latest ?? 0;
}

export function setTapReadCursor(
  coupleId: string,
  sessionId: string,
  tapId: number,
): void {
  statement(
    `INSERT INTO tap_reads (couple_id, session_id, last_tap_id)
     VALUES (?, ?, ?)
     ON CONFLICT (couple_id, session_id)
     DO UPDATE SET last_tap_id = MAX(last_tap_id, excluded.last_tap_id)`,
  ).run(coupleId, sessionId, tapId);
}

/** À l'arrivée dans un duo : ignore les anciens taps qui ne concernent pas ce membre. */
export function initializeTapCursor(coupleId: string, sessionId: string): void {
  statement(
    `INSERT INTO tap_reads (couple_id, session_id, last_tap_id)
     VALUES (?, ?, COALESCE((SELECT MAX(id) FROM taps WHERE couple_id = ?), 0))
     ON CONFLICT (couple_id, session_id)
     DO UPDATE SET last_tap_id = MAX(last_tap_id, excluded.last_tap_id)`,
  ).run(coupleId, sessionId, coupleId);
}

export function purgeOldTapRecords(cutoff: number): void {
  statement(`DELETE FROM taps WHERE created_at < ?`).run(cutoff);
}
