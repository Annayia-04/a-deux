import "server-only";

import { randomBytes } from "node:crypto";
import {
  requireCompleteCouple,
  requireCoupleMembership,
} from "@/lib/couple";
import {
  createSouvenirRecord,
  findSouvenirIdByIdea,
  getSouvenirCoupleId,
  listSouvenirNotes,
  listSouvenirRecords,
  upsertSouvenirNote,
} from "@/lib/db";
import { HttpError } from "@/lib/http";
import { IDEAS_BY_ID } from "@/lib/ideas";
import type { SouvenirSnapshot } from "@/lib/types";

const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
  );
}

function findSnapshot(
  coupleId: string,
  sessionId: string,
  souvenirId: string,
): SouvenirSnapshot | undefined {
  return toSnapshots(coupleId, sessionId).find(
    (souvenir) => souvenir.id === souvenirId,
  );
}

export type SouvenirCreateInput = {
  ideaId?: string;
  title?: string;
  emoji?: string;
  happenedAt?: number;
  body?: string;
};

function toSnapshots(
  coupleId: string,
  sessionId: string,
): SouvenirSnapshot[] {
  const records = listSouvenirRecords(coupleId);
  const notes = listSouvenirNotes(coupleId);

  const bySouvenir = new Map<
    string,
    { mine: string | null; partner: string | null }
  >();
  for (const note of notes) {
    const entry = bySouvenir.get(note.souvenirId) ?? {
      mine: null,
      partner: null,
    };
    if (note.sessionId === sessionId) {
      entry.mine = note.body;
    } else {
      entry.partner = note.body;
    }
    bySouvenir.set(note.souvenirId, entry);
  }

  return records.map((record) => {
    const entry = bySouvenir.get(record.id) ?? { mine: null, partner: null };
    return {
      id: record.id,
      title: record.title,
      emoji: record.emoji,
      ideaId: record.ideaId,
      happenedAt: record.happenedAt,
      createdAt: record.createdAt,
      mine: entry.mine,
      partner: entry.partner,
      complete: entry.mine !== null && entry.partner !== null,
    };
  });
}

export function listSouvenirsForSession(
  sessionId: string,
): SouvenirSnapshot[] {
  const membership = requireCoupleMembership(sessionId);
  return toSnapshots(membership.id, sessionId);
}

export function createSouvenirForSession(
  sessionId: string,
  input: SouvenirCreateInput,
  now: number = Date.now(),
): SouvenirSnapshot {
  const membership = requireCompleteCouple(sessionId);

  const idea = input.ideaId ? IDEAS_BY_ID.get(input.ideaId) : undefined;
  if (input.ideaId && !idea) {
    throw new HttpError(400, "Cette idée de rendez-vous n’existe pas.");
  }

  const title = idea?.title ?? input.title;
  if (!title) {
    throw new HttpError(400, "Donnez un titre à ce souvenir.");
  }

  const happenedAt = input.happenedAt ?? now;
  if (happenedAt > now + MAX_FUTURE_MS) {
    throw new HttpError(400, "Un souvenir ne peut pas être dans le futur.");
  }

  // Un seul souvenir par idée et par duo : si le partenaire l'a déjà créé
  // (même quelques millisecondes plus tôt), on y ajoute simplement son moment.
  if (idea) {
    const existingId = findSouvenirIdByIdea(membership.id, idea.id);
    if (existingId) {
      return saveBodyOnSouvenir(
        membership.id,
        sessionId,
        existingId,
        input.body,
        now,
      );
    }
  }

  const id = randomBytes(12).toString("hex");
  try {
    createSouvenirRecord({
      id,
      coupleId: membership.id,
      ideaId: idea?.id ?? null,
      title,
      emoji: idea?.emoji ?? input.emoji ?? "✨",
      happenedAt,
      createdBy: sessionId,
      body: input.body ?? null,
      now,
    });
  } catch (error) {
    // Course entre les deux membres : l'index unique tranche, on rejoint
    // le souvenir gagnant au lieu d'échouer.
    if (!idea || !isUniqueViolation(error)) throw error;
    const existingId = findSouvenirIdByIdea(membership.id, idea.id);
    if (!existingId) throw error;
    return saveBodyOnSouvenir(
      membership.id,
      sessionId,
      existingId,
      input.body,
      now,
    );
  }

  const created = findSnapshot(membership.id, sessionId, id);
  if (!created) {
    throw new HttpError(500, "Impossible d’enregistrer ce souvenir.");
  }
  return created;
}

function saveBodyOnSouvenir(
  coupleId: string,
  sessionId: string,
  souvenirId: string,
  body: string | undefined,
  now: number,
): SouvenirSnapshot {
  if (body) upsertSouvenirNote(souvenirId, sessionId, body, now);

  const snapshot = findSnapshot(coupleId, sessionId, souvenirId);
  if (!snapshot) {
    throw new HttpError(500, "Impossible d’enregistrer ce souvenir.");
  }
  return snapshot;
}

export function saveSouvenirNoteForSession(
  sessionId: string,
  souvenirId: string,
  body: string,
  now: number = Date.now(),
): SouvenirSnapshot {
  const membership = requireCompleteCouple(sessionId);

  // L'appartenance est vérifiée côté serveur : un identifiant d'un autre duo
  // est traité comme inexistant, sans révéler son existence.
  if (getSouvenirCoupleId(souvenirId) !== membership.id) {
    throw new HttpError(404, "Ce souvenir est introuvable.");
  }

  upsertSouvenirNote(souvenirId, sessionId, body, now);

  const updated = toSnapshots(membership.id, sessionId).find(
    (souvenir) => souvenir.id === souvenirId,
  );
  if (!updated) {
    throw new HttpError(404, "Ce souvenir est introuvable.");
  }
  return updated;
}
