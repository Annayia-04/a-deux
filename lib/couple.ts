import "server-only";

import { randomBytes } from "node:crypto";
import {
  generateCoupleCode,
  isValidCoupleCode,
  normalizeCoupleCode,
} from "@/lib/couple-code";
import {
  countCoupleMembers,
  createCoupleRecord,
  deleteMatchIfNotMutual,
  getCoupleByCode,
  getMembershipBySession,
  hasMutualLike,
  initializeTapCursor,
  insertMatchRecord,
  joinCoupleRecord,
  leaveCoupleRecord,
  listChoiceMatchRecords,
  listMatchRecords,
  markAllChoiceMatchesSeen,
  markAllMatchesViewed,
  markMatchViewed,
  reconcileChoiceMatches,
  reconcileCoupleMatches,
  type MembershipRecord,
} from "@/lib/db";
import { HttpError } from "@/lib/http";
import { CHOICES_BY_ID } from "@/lib/choices";
import { IDEAS_BY_ID } from "@/lib/ideas";
import type {
  ChoiceMatchSummary,
  CoupleSnapshot,
  Idea,
  MatchSnapshot,
} from "@/lib/types";

export const MAX_COUPLE_MEMBERS = 2;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
  );
}

/**
 * Vue publique d'un espace à deux pour une session donnée.
 * Le code n'est renvoyé qu'aux deux membres de cet espace.
 */
export function getCoupleSnapshot(
  sessionId: string,
): CoupleSnapshot | null {
  const membership = getMembershipBySession(sessionId);
  if (!membership) return null;

  const memberCount = countCoupleMembers(membership.id);
  const matches = listMatchRecords(membership.id, sessionId)
    .map((row): MatchSnapshot | null => {
      const idea = IDEAS_BY_ID.get(row.ideaId);
      if (!idea) return null;
      return {
        idea,
        matchedAt: row.createdAt,
        seen: row.seen === 1,
      };
    })
    .filter((match): match is MatchSnapshot => match !== null);

  const choiceMatches: ChoiceMatchSummary[] = listChoiceMatchRecords(
    membership.id,
    sessionId,
  )
    .filter((row) => CHOICES_BY_ID.has(row.choiceId))
    .map((row) => ({
      category: row.category,
      choiceId: row.choiceId,
      matchedAt: row.createdAt,
      seen: row.seen === 1,
    }));

  return {
    code: membership.code,
    memberCount,
    complete: memberCount >= MAX_COUPLE_MEMBERS,
    matches,
    unread: matches.filter((match) => !match.seen).length,
    choiceMatches,
    choiceUnread: choiceMatches.filter((match) => !match.seen).length,
  };
}

/** Récupère l'appartenance au duo ou lève une 409 exploitable par les routes. */
export function requireCoupleMembership(sessionId: string): MembershipRecord {
  const membership = getMembershipBySession(sessionId);
  if (!membership) {
    throw new HttpError(
      409,
      "Vous ne faites partie d’aucun duo. Créez ou rejoignez un espace à deux.",
    );
  }
  return membership;
}

/** Les contenus partagés n'existent qu'une fois les deux membres présents. */
export function requireCompleteCouple(sessionId: string): MembershipRecord {
  const membership = requireCoupleMembership(sessionId);
  if (countCoupleMembers(membership.id) < MAX_COUPLE_MEMBERS) {
    throw new HttpError(
      409,
      "En attente de votre partenaire. Réessayez quand vous serez deux.",
    );
  }
  return membership;
}

export function createCoupleForSession(
  sessionId: string,
  now: number = Date.now(),
): CoupleSnapshot {
  const existing = getMembershipBySession(sessionId);
  if (existing) {
    // Idempotent : un double clic ne crée pas un second duo.
    const snapshot = getCoupleSnapshot(sessionId);
    if (snapshot) return snapshot;
    throw new HttpError(409, "Vous faites déjà partie d’un espace à deux.");
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = randomBytes(12).toString("hex");
    const code = generateCoupleCode();
    try {
      createCoupleRecord(id, code, sessionId, now);
      const snapshot = getCoupleSnapshot(sessionId);
      if (snapshot) return snapshot;
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  throw new HttpError(
    503,
    "Impossible de créer l’espace à deux. Réessayez dans un instant.",
  );
}

export function joinCoupleForSession(
  rawCode: string,
  sessionId: string,
  now: number = Date.now(),
): CoupleSnapshot {
  const code = normalizeCoupleCode(rawCode);
  if (!isValidCoupleCode(code)) {
    throw new HttpError(400, "Ce code d’invitation n’est pas valide.");
  }

  const existing = getMembershipBySession(sessionId);
  if (existing) {
    if (existing.code === code) {
      const snapshot = getCoupleSnapshot(sessionId);
      if (snapshot) return snapshot;
    }
    throw new HttpError(
      409,
      "Vous avez déjà un espace à deux. Quittez-le avant d’en rejoindre un autre.",
    );
  }

  const couple = getCoupleByCode(code);
  if (!couple) {
    throw new HttpError(404, "Aucun duo ne correspond à ce code.");
  }

  const result = joinCoupleRecord(couple.id, sessionId, now);
  if (result === "full") {
    throw new HttpError(409, "Ce duo est déjà complet.");
  }
  if (result === "other-couple") {
    throw new HttpError(409, "Vous avez déjà un espace à deux.");
  }

  // Les likes déjà présents des deux côtés peuvent former des matchs immédiats.
  reconcileCoupleMatches(couple.id, now);
  reconcileChoiceMatches(couple.id, now);
  // La personne qui rejoint découvre ces matchs tout de suite : ils sont vus.
  markAllMatchesViewed(couple.id, sessionId, now);
  markAllChoiceMatchesSeen(couple.id, sessionId, now);
  // Les taps antérieurs à son arrivée ne la concernent pas.
  initializeTapCursor(couple.id, sessionId);

  const snapshot = getCoupleSnapshot(sessionId);
  if (!snapshot) {
    throw new HttpError(500, "Impossible de rejoindre cet espace à deux.");
  }
  return snapshot;
}

export function leaveCoupleForSession(sessionId: string): void {
  const result = leaveCoupleRecord(sessionId);
  if (!result) {
    throw new HttpError(409, "Vous ne faites partie d’aucun duo.");
  }
}

/**
 * Enregistre un match si les deux membres ont liké la même idée.
 * Renvoie l'idée concernée lorsque le match vient d'être créé.
 */
export function recordMutualMatchForSession(
  sessionId: string,
  idea: Idea,
  now: number = Date.now(),
): Idea | null {
  const membership = getMembershipBySession(sessionId);
  if (!membership) return null;
  if (!hasMutualLike(membership.id, idea.id)) return null;

  const created = insertMatchRecord(membership.id, idea.id, now);
  if (!created) return null;

  // La personne qui vient de swiper voit la célébration tout de suite.
  markMatchViewed(membership.id, idea.id, sessionId, now);
  return idea;
}

/** Après une annulation : le match ne tient que si les deux likes existent encore. */
export function reconcileMatchForSession(
  sessionId: string,
  ideaId: string,
): void {
  const membership = getMembershipBySession(sessionId);
  if (!membership) return;
  deleteMatchIfNotMutual(membership.id, ideaId);
}

/** Après un changement de sélection : réaligne tous les matchs du duo. */
export function reconcileMatchesForSession(sessionId: string): void {
  const membership = getMembershipBySession(sessionId);
  if (!membership) return;
  reconcileCoupleMatches(membership.id);
}

export function markCoupleMatchesSeen(
  sessionId: string,
  now: number = Date.now(),
): CoupleSnapshot | null {
  const membership = getMembershipBySession(sessionId);
  if (!membership) return null;
  markAllMatchesViewed(membership.id, sessionId, now);
  return getCoupleSnapshot(sessionId);
}
