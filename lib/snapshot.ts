import "server-only";

import { getCoupleSnapshot } from "@/lib/couple";
import { getSessionRecord, listSwipes } from "@/lib/db";
import { IDEAS_BY_ID } from "@/lib/ideas";
import { rankIdeas } from "@/lib/recommend";
import { prefsSchema } from "@/lib/schemas";
import { hashToken, isValidSessionToken } from "@/lib/session-token";
import type { Idea, SessionSnapshot } from "@/lib/types";

export type LoadedSession = SessionSnapshot & {
  id: string;
  seed: string;
};

/**
 * Charge une session à partir du jeton du cookie (jamais du client).
 * Le deck est recalculé de façon déterministe : même seed = même ordre.
 */
export function loadSessionByToken(token: string | null): LoadedSession | null {
  if (!token || !isValidSessionToken(token)) return null;

  const record = getSessionRecord(hashToken(token));
  if (!record) return null;

  let rawPrefs: unknown;
  try {
    rawPrefs = JSON.parse(record.prefs);
  } catch {
    return null;
  }

  const parsedPrefs = prefsSchema.safeParse(rawPrefs);
  if (!parsedPrefs.success) return null;

  const prefs = parsedPrefs.data;
  const ranked = rankIdeas(prefs, record.seed);
  const swipes = listSwipes(record.id);
  const swipedIds = new Set(swipes.map((swipe) => swipe.ideaId));

  const likedIdeas = swipes
    .filter((swipe) => swipe.direction === "like")
    .map((swipe) => IDEAS_BY_ID.get(swipe.ideaId))
    .filter((idea): idea is Idea => Boolean(idea));

  return {
    id: record.id,
    seed: record.seed,
    prefs,
    ideas: ranked.filter((idea) => !swipedIds.has(idea.id)),
    likedIdeas,
    total: ranked.length,
    swiped: swipes.length,
    couple: getCoupleSnapshot(record.id),
  };
}

/** Retire les champs internes avant de les passer au client. */
export function toPublicSnapshot(session: LoadedSession): SessionSnapshot {
  const { prefs, ideas, likedIdeas, total, swiped, couple } = session;
  return { prefs, ideas, likedIdeas, total, swiped, couple };
}
