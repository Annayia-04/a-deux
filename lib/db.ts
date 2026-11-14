import "server-only";

import { getPool, query, queryOne, withTransaction } from "@/lib/pg-pool";
import type { ChoiceCategory, Prefs, SwipeDirection } from "@/lib/types";

/**
 * Accès aux données de jeu dans PostgreSQL.
 *
 * Toutes les fonctions sont asynchrones : un pool partagé sert l'identité et
 * le jeu, et Vercel ne conserve aucun disque. Les identifiants restent des
 * TEXT générés par l'application, les horodatages des BIGINT en millisecondes.
 */

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

export type WidgetDeviceRecord = {
  sessionId: string;
  label: string | null;
  createdAt: number;
  lastUsedAt: number | null;
};

// ---------------------------------------------------------------------------
// Sessions et swipes
// ---------------------------------------------------------------------------

export async function createSessionRecord(
  id: string,
  prefs: Prefs,
  seed: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO sessions (id, prefs, seed, created_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $4)`,
    [id, JSON.stringify(prefs), seed, now],
  );
}

/**
 * Remplace la sélection d'une session existante sans changer son identifiant.
 * L'appartenance à un espace à deux et les matchs déjà obtenus sont conservés.
 */
export async function resetSessionRecord(
  id: string,
  prefs: Prefs,
  seed: string,
  now: number = Date.now(),
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM swipes WHERE session_id = $1", [id]);
    await client.query(
      `UPDATE sessions SET prefs = $1, seed = $2, last_seen_at = $3 WHERE id = $4`,
      [JSON.stringify(prefs), seed, now, id],
    );
  });
}

export async function getSessionRecord(
  id: string,
): Promise<SessionRecord | null> {
  return queryOne<SessionRecord>(
    `SELECT id, prefs, seed, created_at AS "createdAt",
            last_seen_at AS "lastSeenAt"
       FROM sessions WHERE id = $1`,
    [id],
  );
}

/**
 * Résout un identifiant de cookie vers la session canonique.
 * Un alias (appareil secondaire connecté à un compte) pointe vers la session
 * détenue par le compte, sans dupliquer les swipes ni l'appartenance au duo.
 */
export async function resolveSessionId(id: string): Promise<string | null> {
  const direct = await queryOne<{ id: string }>(
    "SELECT id FROM sessions WHERE id = $1",
    [id],
  );
  if (direct) return id;

  const alias = await queryOne<{ sessionId: string }>(
    `SELECT session_id AS "sessionId" FROM session_aliases WHERE alias_id = $1`,
    [id],
  );
  if (!alias) return null;

  const canonical = await queryOne<{ id: string }>(
    "SELECT id FROM sessions WHERE id = $1",
    [alias.sessionId],
  );
  return canonical ? alias.sessionId : null;
}

export async function isSessionAlias(id: string): Promise<boolean> {
  const row = await queryOne<{ present: number }>(
    "SELECT 1 AS present FROM session_aliases WHERE alias_id = $1",
    [id],
  );
  return Boolean(row);
}

export async function createSessionAlias(
  aliasId: string,
  sessionId: string,
  userId: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO session_aliases (alias_id, session_id, user_id, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (alias_id)
     DO UPDATE SET session_id = EXCLUDED.session_id, user_id = EXCLUDED.user_id`,
    [aliasId, sessionId, userId, now],
  );
}

export async function deleteSessionAlias(aliasId: string): Promise<void> {
  await query("DELETE FROM session_aliases WHERE alias_id = $1", [aliasId]);
}

export async function deleteSessionAliasesForUser(
  userId: string,
): Promise<void> {
  await query("DELETE FROM session_aliases WHERE user_id = $1", [userId]);
}

/**
 * Enregistre un appareil widget. Le jeton n'est jamais stocké en clair :
 * `tokenHash` est le SHA-256 du jeton remis une seule fois au téléphone.
 */
export async function createWidgetDevice(
  tokenHash: string,
  sessionId: string,
  label: string | null,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO widget_devices (token_hash, session_id, label, created_at)
     VALUES ($1, $2, $3, $4)`,
    [tokenHash, sessionId, label, now],
  );
}

export async function getWidgetDevice(
  tokenHash: string,
): Promise<WidgetDeviceRecord | null> {
  return queryOne<WidgetDeviceRecord>(
    `SELECT session_id AS "sessionId", label, created_at AS "createdAt",
            last_used_at AS "lastUsedAt"
       FROM widget_devices
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

export async function countActiveWidgetDevices(
  sessionId: string,
): Promise<number> {
  const row = await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM widget_devices
      WHERE session_id = $1 AND revoked_at IS NULL`,
    [sessionId],
  );
  return row?.total ?? 0;
}

export async function touchWidgetDevice(
  tokenHash: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    "UPDATE widget_devices SET last_used_at = $1 WHERE token_hash = $2",
    [now, tokenHash],
  );
}

/** Révoque un appareil ; renvoie false s'il n'appartient pas à la session. */
export async function revokeWidgetDevice(
  tokenHash: string,
  sessionId: string,
): Promise<boolean> {
  const result = await getPoolQuery(
    `UPDATE widget_devices SET revoked_at = $1
      WHERE token_hash = $2 AND session_id = $3 AND revoked_at IS NULL`,
    [Date.now(), tokenHash, sessionId],
  );
  return result > 0;
}

export async function deleteWidgetDevicesForSession(
  sessionId: string,
): Promise<void> {
  await query("DELETE FROM widget_devices WHERE session_id = $1", [sessionId]);
}

export async function touchSession(
  id: string,
  now: number = Date.now(),
): Promise<void> {
  await query("UPDATE sessions SET last_seen_at = $1 WHERE id = $2", [now, id]);
}

export async function deleteSessionRecord(id: string): Promise<void> {
  await query("DELETE FROM sessions WHERE id = $1", [id]);
  await cleanupOrphanCouples();
}

export async function deleteExpiredSessions(
  ttlMs: number,
  now: number = Date.now(),
): Promise<void> {
  await query("DELETE FROM sessions WHERE created_at < $1", [now - ttlMs]);
  await cleanupOrphanCouples();
}

export async function addSwipe(
  sessionId: string,
  ideaId: string,
  direction: SwipeDirection,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO swipes (session_id, idea_id, direction, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, idea_id)
     DO UPDATE SET direction = EXCLUDED.direction,
                   created_at = EXCLUDED.created_at`,
    [sessionId, ideaId, direction, now],
  );
}

export async function listSwipes(sessionId: string): Promise<SwipeRecord[]> {
  return query<SwipeRecord>(
    `SELECT idea_id AS "ideaId", direction, created_at AS "createdAt"
       FROM swipes
      WHERE session_id = $1
      ORDER BY created_at DESC, idea_id DESC`,
    [sessionId],
  );
}

export async function countSwipes(sessionId: string): Promise<number> {
  const row = await queryOne<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM swipes WHERE session_id = $1",
    [sessionId],
  );
  return row?.total ?? 0;
}

/** Annule le dernier swipe et renvoie l'idée restaurée (transactionnel). */
export async function undoLastSwipe(sessionId: string): Promise<string | null> {
  return withTransaction(async (client) => {
    const row = await client.query<{ ideaId: string }>(
      `SELECT idea_id AS "ideaId" FROM swipes
        WHERE session_id = $1
        ORDER BY created_at DESC, idea_id DESC
        LIMIT 1`,
      [sessionId],
    );

    const ideaId = row.rows[0]?.ideaId;
    if (!ideaId) return null;

    await client.query(
      "DELETE FROM swipes WHERE session_id = $1 AND idea_id = $2",
      [sessionId, ideaId],
    );
    return ideaId;
  });
}

// ---------------------------------------------------------------------------
// Espaces à deux
// ---------------------------------------------------------------------------

export async function createCoupleRecord(
  id: string,
  code: string,
  sessionId: string,
  now: number = Date.now(),
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      "INSERT INTO couples (id, code, created_at) VALUES ($1, $2, $3)",
      [id, code, now],
    );
    await client.query(
      `INSERT INTO couple_members (couple_id, session_id, joined_at)
       VALUES ($1, $2, $3)`,
      [id, sessionId, now],
    );
  });
}

export async function getMembershipBySession(
  sessionId: string,
): Promise<MembershipRecord | null> {
  return queryOne<MembershipRecord>(
    `SELECT c.id, c.code, c.created_at AS "createdAt",
            m.session_id AS "sessionId", m.joined_at AS "joinedAt"
       FROM couple_members m
       JOIN couples c ON c.id = m.couple_id
      WHERE m.session_id = $1`,
    [sessionId],
  );
}

export async function getCoupleByCode(
  code: string,
): Promise<CoupleRecord | null> {
  return queryOne<CoupleRecord>(
    `SELECT id, code, created_at AS "createdAt" FROM couples WHERE code = $1`,
    [code],
  );
}

export async function countCoupleMembers(coupleId: string): Promise<number> {
  const row = await queryOne<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM couple_members WHERE couple_id = $1",
    [coupleId],
  );
  return row?.total ?? 0;
}

export async function joinCoupleRecord(
  coupleId: string,
  sessionId: string,
  now: number = Date.now(),
): Promise<JoinResult> {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      `SELECT c.id
         FROM couple_members m
         JOIN couples c ON c.id = m.couple_id
        WHERE m.session_id = $1`,
      [sessionId],
    );
    if (existing.rows[0]) {
      return existing.rows[0].id === coupleId
        ? "already-member"
        : "other-couple";
    }

    // Verrouille le duo : deux arrivées simultanées ne peuvent pas dépasser 2.
    await client.query("SELECT id FROM couples WHERE id = $1 FOR UPDATE", [
      coupleId,
    ]);
    const count = await client.query<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM couple_members WHERE couple_id = $1",
      [coupleId],
    );
    if ((count.rows[0]?.total ?? 0) >= 2) return "full";

    await client.query(
      `INSERT INTO couple_members (couple_id, session_id, joined_at)
       VALUES ($1, $2, $3)`,
      [coupleId, sessionId, now],
    );
    return "joined";
  });
}

export async function leaveCoupleRecord(
  sessionId: string,
): Promise<LeaveResult | null> {
  return withTransaction(async (client) => {
    const membership = await client.query<{ id: string }>(
      `SELECT c.id
         FROM couple_members m
         JOIN couples c ON c.id = m.couple_id
        WHERE m.session_id = $1`,
      [sessionId],
    );
    const coupleId = membership.rows[0]?.id;
    if (!coupleId) return null;

    await client.query("DELETE FROM couple_members WHERE session_id = $1", [
      sessionId,
    ]);
    // Le duo est rompu : les contenus partagés appartiennent aux deux membres.
    await client.query("DELETE FROM matches WHERE couple_id = $1", [coupleId]);
    await client.query(
      `DELETE FROM souvenir_notes WHERE souvenir_id IN (
         SELECT id FROM souvenirs WHERE couple_id = $1
       )`,
      [coupleId],
    );
    await client.query("DELETE FROM souvenirs WHERE couple_id = $1", [coupleId]);
    await client.query("DELETE FROM choice_match_views WHERE couple_id = $1", [
      coupleId,
    ]);
    await client.query("DELETE FROM choice_matches WHERE couple_id = $1", [
      coupleId,
    ]);
    await client.query("DELETE FROM tap_reads WHERE couple_id = $1", [coupleId]);
    await client.query("DELETE FROM taps WHERE couple_id = $1", [coupleId]);

    const remaining = await client.query<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM couple_members WHERE couple_id = $1",
      [coupleId],
    );
    const empty = (remaining.rows[0]?.total ?? 0) === 0;
    if (empty) {
      await client.query("DELETE FROM couples WHERE id = $1", [coupleId]);
    }

    return { coupleId, coupleDeleted: empty };
  });
}

/** Supprime les couples qui n'ont plus aucun membre (session expirée, etc.). */
export async function cleanupOrphanCouples(): Promise<void> {
  await query(
    `DELETE FROM couples
      WHERE id NOT IN (SELECT DISTINCT couple_id FROM couple_members)`,
  );
}

// ---------------------------------------------------------------------------
// Matchs mutuels
// ---------------------------------------------------------------------------

export async function hasMutualLike(
  coupleId: string,
  ideaId: string,
): Promise<boolean> {
  const row = await queryOne<{ total: number }>(
    `SELECT COUNT(DISTINCT s.session_id)::int AS total
       FROM swipes s
       JOIN couple_members m ON m.session_id = s.session_id
      WHERE m.couple_id = $1 AND s.idea_id = $2 AND s.direction = 'like'`,
    [coupleId, ideaId],
  );
  return (row?.total ?? 0) >= 2;
}

export async function listMutualLikeIdeaIds(
  coupleId: string,
): Promise<string[]> {
  const rows = await query<{ ideaId: string }>(
    `SELECT s.idea_id AS "ideaId"
       FROM swipes s
       JOIN couple_members m ON m.session_id = s.session_id
      WHERE m.couple_id = $1 AND s.direction = 'like'
      GROUP BY s.idea_id
     HAVING COUNT(DISTINCT s.session_id) >= 2`,
    [coupleId],
  );
  return rows.map((row) => row.ideaId);
}

/** Insère un match s'il vient d'être créé. Renvoie true pour la nouveauté. */
export async function insertMatchRecord(
  coupleId: string,
  ideaId: string,
  now: number = Date.now(),
): Promise<boolean> {
  const changes = await getPoolQuery(
    `INSERT INTO matches (couple_id, idea_id, created_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (couple_id, idea_id) DO NOTHING`,
    [coupleId, ideaId, now],
  );
  return changes > 0;
}

export async function deleteMatchRecord(
  coupleId: string,
  ideaId: string,
): Promise<void> {
  await query("DELETE FROM matches WHERE couple_id = $1 AND idea_id = $2", [
    coupleId,
    ideaId,
  ]);
}

export async function listMatchRecords(
  coupleId: string,
  sessionId: string,
): Promise<MatchRecord[]> {
  return query<MatchRecord>(
    `SELECT m.idea_id AS "ideaId", m.created_at AS "createdAt",
            CASE WHEN v.session_id IS NULL THEN 0 ELSE 1 END AS "seen"
       FROM matches m
       LEFT JOIN match_views v
         ON v.couple_id = m.couple_id
        AND v.idea_id = m.idea_id
        AND v.session_id = $1
      WHERE m.couple_id = $2
      ORDER BY m.created_at DESC, m.idea_id DESC`,
    [sessionId, coupleId],
  );
}

export async function markMatchViewed(
  coupleId: string,
  ideaId: string,
  sessionId: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO match_views (couple_id, idea_id, session_id, viewed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (couple_id, idea_id, session_id) DO NOTHING`,
    [coupleId, ideaId, sessionId, now],
  );
}

export async function markAllMatchesViewed(
  coupleId: string,
  sessionId: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO match_views (couple_id, idea_id, session_id, viewed_at)
     SELECT couple_id, idea_id, $1, $2 FROM matches WHERE couple_id = $3
     ON CONFLICT (couple_id, idea_id, session_id) DO NOTHING`,
    [sessionId, now, coupleId],
  );
}

/**
 * Remet les matchs en phase avec les likes réellement présents.
 * Utilisé au démarrage d'un duo, après une annulation ou un changement de sélection.
 */
export async function reconcileCoupleMatches(
  coupleId: string,
  now: number = Date.now(),
): Promise<void> {
  await withTransaction(async (client) => {
    const mutual = await client.query<{ ideaId: string }>(
      `SELECT s.idea_id AS "ideaId"
         FROM swipes s
         JOIN couple_members m ON m.session_id = s.session_id
        WHERE m.couple_id = $1 AND s.direction = 'like'
        GROUP BY s.idea_id
       HAVING COUNT(DISTINCT s.session_id) >= 2`,
      [coupleId],
    );
    const mutualSet = new Set(mutual.rows.map((row) => row.ideaId));

    const existing = await client.query<{ ideaId: string }>(
      `SELECT idea_id AS "ideaId" FROM matches WHERE couple_id = $1`,
      [coupleId],
    );
    const existingSet = new Set(existing.rows.map((row) => row.ideaId));

    for (const ideaId of existingSet) {
      if (!mutualSet.has(ideaId)) {
        await client.query(
          "DELETE FROM matches WHERE couple_id = $1 AND idea_id = $2",
          [coupleId, ideaId],
        );
      }
    }
    for (const ideaId of mutualSet) {
      if (!existingSet.has(ideaId)) {
        await client.query(
          `INSERT INTO matches (couple_id, idea_id, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (couple_id, idea_id) DO NOTHING`,
          [coupleId, ideaId, now],
        );
      }
    }
  });
}

export async function deleteMatchIfNotMutual(
  coupleId: string,
  ideaId: string,
): Promise<void> {
  if (!(await hasMutualLike(coupleId, ideaId))) {
    await deleteMatchRecord(coupleId, ideaId);
  }
}

// ---------------------------------------------------------------------------
// Souvenirs
// ---------------------------------------------------------------------------

export async function createSouvenirRecord(input: {
  id: string;
  coupleId: string;
  ideaId: string | null;
  title: string;
  emoji: string;
  happenedAt: number;
  createdBy: string;
  body: string | null;
  now?: number;
}): Promise<void> {
  const now = input.now ?? Date.now();
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO souvenirs
         (id, couple_id, idea_id, title, emoji, happened_at, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.id,
        input.coupleId,
        input.ideaId,
        input.title,
        input.emoji,
        input.happenedAt,
        input.createdBy,
        now,
      ],
    );

    if (input.body) {
      await client.query(
        `INSERT INTO souvenir_notes
           (souvenir_id, session_id, body, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)`,
        [input.id, input.createdBy, input.body, now],
      );
    }
  });
}

export async function listSouvenirRecords(
  coupleId: string,
): Promise<SouvenirRecord[]> {
  return query<SouvenirRecord>(
    `SELECT id, idea_id AS "ideaId", title, emoji,
            happened_at AS "happenedAt", created_at AS "createdAt",
            created_by AS "createdBy"
       FROM souvenirs
      WHERE couple_id = $1
      ORDER BY happened_at DESC, created_at DESC, id DESC`,
    [coupleId],
  );
}

export async function getSouvenirCoupleId(
  souvenirId: string,
): Promise<string | null> {
  const row = await queryOne<{ coupleId: string }>(
    `SELECT couple_id AS "coupleId" FROM souvenirs WHERE id = $1`,
    [souvenirId],
  );
  return row?.coupleId ?? null;
}

/** Retrouve le souvenir d'un duo pour une idée donnée (unicité garantie). */
export async function findSouvenirIdByIdea(
  coupleId: string,
  ideaId: string,
): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM souvenirs WHERE couple_id = $1 AND idea_id = $2",
    [coupleId, ideaId],
  );
  return row?.id ?? null;
}

export async function listSouvenirNotes(
  coupleId: string,
): Promise<SouvenirNoteRecord[]> {
  return query<SouvenirNoteRecord>(
    `SELECT n.souvenir_id AS "souvenirId", n.session_id AS "sessionId",
            n.body, n.updated_at AS "updatedAt"
       FROM souvenir_notes n
       JOIN souvenirs s ON s.id = n.souvenir_id
      WHERE s.couple_id = $1
      ORDER BY n.updated_at ASC`,
    [coupleId],
  );
}

export async function upsertSouvenirNote(
  souvenirId: string,
  sessionId: string,
  body: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO souvenir_notes
       (souvenir_id, session_id, body, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (souvenir_id, session_id)
     DO UPDATE SET body = EXCLUDED.body, updated_at = EXCLUDED.updated_at`,
    [souvenirId, sessionId, body, now],
  );
}

// ---------------------------------------------------------------------------
// Choix Nourriture / Films
// ---------------------------------------------------------------------------

export async function addChoiceSwipe(
  sessionId: string,
  category: ChoiceCategory,
  choiceId: string,
  direction: SwipeDirection,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO choice_swipes
       (session_id, category, choice_id, direction, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (session_id, category, choice_id)
     DO UPDATE SET direction = EXCLUDED.direction,
                   created_at = EXCLUDED.created_at`,
    [sessionId, category, choiceId, direction, now],
  );
}

export async function listChoiceSwipes(
  sessionId: string,
  category: ChoiceCategory,
): Promise<{ choiceId: string; direction: SwipeDirection }[]> {
  return query<{ choiceId: string; direction: SwipeDirection }>(
    `SELECT choice_id AS "choiceId", direction
       FROM choice_swipes
      WHERE session_id = $1 AND category = $2
      ORDER BY created_at DESC, choice_id DESC`,
    [sessionId, category],
  );
}

export async function hasMutualChoiceLike(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
): Promise<boolean> {
  const row = await queryOne<{ total: number }>(
    `SELECT COUNT(DISTINCT s.session_id)::int AS total
       FROM choice_swipes s
       JOIN couple_members m ON m.session_id = s.session_id
      WHERE m.couple_id = $1 AND s.category = $2 AND s.choice_id = $3
        AND s.direction = 'like'`,
    [coupleId, category, choiceId],
  );
  return (row?.total ?? 0) >= 2;
}

export async function listMutualChoiceKeys(
  coupleId: string,
): Promise<{ category: ChoiceCategory; choiceId: string }[]> {
  return query<{ category: ChoiceCategory; choiceId: string }>(
    `SELECT s.category, s.choice_id AS "choiceId"
       FROM choice_swipes s
       JOIN couple_members m ON m.session_id = s.session_id
      WHERE m.couple_id = $1 AND s.direction = 'like'
      GROUP BY s.category, s.choice_id
     HAVING COUNT(DISTINCT s.session_id) >= 2`,
    [coupleId],
  );
}

export async function insertChoiceMatchRecord(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
  now: number = Date.now(),
): Promise<boolean> {
  const changes = await getPoolQuery(
    `INSERT INTO choice_matches (couple_id, category, choice_id, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (couple_id, category, choice_id) DO NOTHING`,
    [coupleId, category, choiceId, now],
  );
  return changes > 0;
}

export async function deleteChoiceMatchRecord(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
): Promise<void> {
  await query(
    `DELETE FROM choice_matches
      WHERE couple_id = $1 AND category = $2 AND choice_id = $3`,
    [coupleId, category, choiceId],
  );
}

export async function listChoiceMatchRecords(
  coupleId: string,
  sessionId: string,
  category: ChoiceCategory | null = null,
): Promise<ChoiceMatchRecord[]> {
  return query<ChoiceMatchRecord>(
    `SELECT m.category, m.choice_id AS "choiceId",
            m.created_at AS "createdAt",
            CASE WHEN v.session_id IS NULL THEN 0 ELSE 1 END AS "seen"
       FROM choice_matches m
       LEFT JOIN choice_match_views v
         ON v.couple_id = m.couple_id
        AND v.category = m.category
        AND v.choice_id = m.choice_id
        AND v.session_id = $1
      WHERE m.couple_id = $2 AND ($3::text IS NULL OR m.category = $3)
      ORDER BY m.created_at DESC, m.choice_id DESC`,
    [sessionId, coupleId, category],
  );
}

export async function markChoiceMatchViewed(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
  sessionId: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO choice_match_views
       (couple_id, category, choice_id, session_id, viewed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (couple_id, category, choice_id, session_id) DO NOTHING`,
    [coupleId, category, choiceId, sessionId, now],
  );
}

export async function markAllChoiceMatchesViewed(
  coupleId: string,
  category: ChoiceCategory,
  sessionId: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO choice_match_views
       (couple_id, category, choice_id, session_id, viewed_at)
     SELECT couple_id, category, choice_id, $1, $2
       FROM choice_matches
      WHERE couple_id = $3 AND category = $4
     ON CONFLICT (couple_id, category, choice_id, session_id) DO NOTHING`,
    [sessionId, now, coupleId, category],
  );
}

export async function deleteChoiceMatchIfNotMutual(
  coupleId: string,
  category: ChoiceCategory,
  choiceId: string,
): Promise<void> {
  if (!(await hasMutualChoiceLike(coupleId, category, choiceId))) {
    await deleteChoiceMatchRecord(coupleId, category, choiceId);
  }
}

/** Réaligne les matchs de choix après une arrivée ou un changement de duo. */
export async function reconcileChoiceMatches(
  coupleId: string,
  now: number = Date.now(),
): Promise<void> {
  await withTransaction(async (client) => {
    const mutualRows = await client.query<{
      category: ChoiceCategory;
      choiceId: string;
    }>(
      `SELECT s.category, s.choice_id AS "choiceId"
         FROM choice_swipes s
         JOIN couple_members m ON m.session_id = s.session_id
        WHERE m.couple_id = $1 AND s.direction = 'like'
        GROUP BY s.category, s.choice_id
       HAVING COUNT(DISTINCT s.session_id) >= 2`,
      [coupleId],
    );
    const mutual = new Set(
      mutualRows.rows.map((row) => `${row.category}:${row.choiceId}`),
    );

    const existingRows = await client.query<{
      category: ChoiceCategory;
      choiceId: string;
    }>(
      `SELECT category, choice_id AS "choiceId"
         FROM choice_matches WHERE couple_id = $1`,
      [coupleId],
    );
    const existing = existingRows.rows.map((row) => ({
      ...row,
      key: `${row.category}:${row.choiceId}`,
    }));
    const existingKeys = new Set(existing.map((row) => row.key));

    for (const row of existing) {
      if (!mutual.has(row.key)) {
        await client.query(
          `DELETE FROM choice_matches
            WHERE couple_id = $1 AND category = $2 AND choice_id = $3`,
          [coupleId, row.category, row.choiceId],
        );
      }
    }
    for (const key of mutual) {
      if (existingKeys.has(key)) continue;
      const separator = key.indexOf(":");
      const category = key.slice(0, separator) as ChoiceCategory;
      const choiceId = key.slice(separator + 1);
      await client.query(
        `INSERT INTO choice_matches (couple_id, category, choice_id, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (couple_id, category, choice_id) DO NOTHING`,
        [coupleId, category, choiceId, now],
      );
    }
  });
}

export async function markAllChoiceMatchesSeen(
  coupleId: string,
  sessionId: string,
  now: number = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO choice_match_views
       (couple_id, category, choice_id, session_id, viewed_at)
     SELECT couple_id, category, choice_id, $1, $2
       FROM choice_matches WHERE couple_id = $3
     ON CONFLICT (couple_id, category, choice_id, session_id) DO NOTHING`,
    [sessionId, now, coupleId],
  );
}

// ---------------------------------------------------------------------------
// Taps
// ---------------------------------------------------------------------------

export async function insertTapRecord(
  coupleId: string,
  fromSession: string,
  now: number = Date.now(),
): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO taps (couple_id, from_session, created_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [coupleId, fromSession, now],
  );
  return row?.id ?? 0;
}

export async function getTapReadCursor(
  coupleId: string,
  sessionId: string,
): Promise<number> {
  const row = await queryOne<{ lastTapId: number }>(
    `SELECT last_tap_id AS "lastTapId" FROM tap_reads
      WHERE couple_id = $1 AND session_id = $2`,
    [coupleId, sessionId],
  );
  return row?.lastTapId ?? 0;
}

export async function listPartnerTapsAfter(
  coupleId: string,
  sessionId: string,
  afterId: number,
): Promise<TapRecord[]> {
  return query<TapRecord>(
    `SELECT id, created_at AS "createdAt"
       FROM taps
      WHERE couple_id = $1 AND from_session <> $2 AND id > $3
      ORDER BY id DESC
      LIMIT 20`,
    [coupleId, sessionId, afterId],
  );
}

export async function getLatestPartnerTapId(
  coupleId: string,
  sessionId: string,
): Promise<number> {
  const row = await queryOne<{ latest: number | null }>(
    `SELECT MAX(id) AS latest
       FROM taps
      WHERE couple_id = $1 AND from_session <> $2`,
    [coupleId, sessionId],
  );
  return row?.latest ?? 0;
}

export async function setTapReadCursor(
  coupleId: string,
  sessionId: string,
  tapId: number,
): Promise<void> {
  await query(
    `INSERT INTO tap_reads (couple_id, session_id, last_tap_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (couple_id, session_id)
     DO UPDATE SET last_tap_id = GREATEST(tap_reads.last_tap_id, EXCLUDED.last_tap_id)`,
    [coupleId, sessionId, tapId],
  );
}

/** À l'arrivée dans un duo : ignore les anciens taps qui ne concernent pas ce membre. */
export async function initializeTapCursor(
  coupleId: string,
  sessionId: string,
): Promise<void> {
  await query(
    `INSERT INTO tap_reads (couple_id, session_id, last_tap_id)
     VALUES ($1, $2, COALESCE((SELECT MAX(id) FROM taps WHERE couple_id = $1), 0))
     ON CONFLICT (couple_id, session_id)
     DO UPDATE SET last_tap_id = GREATEST(tap_reads.last_tap_id, EXCLUDED.last_tap_id)`,
    [coupleId, sessionId],
  );
}

export async function purgeOldTapRecords(cutoff: number): Promise<void> {
  await query("DELETE FROM taps WHERE created_at < $1", [cutoff]);
}

/**
 * Exécute une écriture et renvoie le nombre de lignes affectées.
 * Utilisé par les insertions « ON CONFLICT DO NOTHING » et les révocations.
 */
async function getPoolQuery(
  text: string,
  params: readonly unknown[],
): Promise<number> {
  const result = await getPool().query(text, params as unknown[]);
  return result.rowCount ?? 0;
}
