import "server-only";

import { randomBytes } from "node:crypto";
import {
  requireCompleteCouple,
  requireCoupleMembership,
} from "@/lib/couple";
import {
  createSouvenirRecord,
  getSouvenirCoupleId,
  listSouvenirNotes,
  listSouvenirRecords,
  upsertSouvenirNote,
} from "@/lib/db";
import { HttpError } from "@/lib/http";
import { IDEAS_BY_ID } from "@/lib/ideas";
import type { SouvenirSnapshot } from "@/lib/types";

const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

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

  const id = randomBytes(12).toString("hex");
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

  const created = toSnapshots(membership.id, sessionId).find(
    (souvenir) => souvenir.id === id,
  );
  if (!created) {
    throw new HttpError(500, "Impossible d’enregistrer ce souvenir.");
  }
  return created;
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
