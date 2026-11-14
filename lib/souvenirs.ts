import "server-only";

import { randomBytes } from "node:crypto";
import {
  requireCompleteCouple,
  requireCoupleMembership,
} from "@/lib/couple";
import {
  countSouvenirPhotos,
  countSouvenirPhotosForSouvenir,
  createSouvenirPhotoRecord,
  createSouvenirRecord,
  deleteSouvenirPhotoRecord,
  findSouvenirIdByIdea,
  getSouvenirCoupleId,
  getSouvenirPhotoForCouple,
  listSouvenirNotes,
  listSouvenirPhotos,
  listSouvenirRecords,
  upsertSouvenirNote,
} from "@/lib/db";
import {
  detectImageMime,
  isPhotoTooLarge,
  MAX_PHOTOS_PER_COUPLE,
  MAX_PHOTOS_PER_SOUVENIR,
} from "@/lib/images";
import { HttpError } from "@/lib/http";
import { IDEAS_BY_ID } from "@/lib/ideas";
import type { SouvenirSnapshot } from "@/lib/types";

const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

async function findSnapshot(
  coupleId: string,
  sessionId: string,
  souvenirId: string,
): Promise<SouvenirSnapshot | undefined> {
  return (await toSnapshots(coupleId, sessionId)).find(
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

async function toSnapshots(
  coupleId: string,
  sessionId: string,
): Promise<SouvenirSnapshot[]> {
  const records = await listSouvenirRecords(coupleId);
  const notes = await listSouvenirNotes(coupleId);
  const photos = await listSouvenirPhotos(coupleId);

  const photosBySouvenir = new Map<
    string,
    { id: string; createdAt: number; mine: boolean }[]
  >();
  for (const photo of photos) {
    const list = photosBySouvenir.get(photo.souvenirId) ?? [];
    list.push({
      id: photo.id,
      createdAt: photo.createdAt,
      mine: photo.sessionId === sessionId,
    });
    photosBySouvenir.set(photo.souvenirId, list);
  }

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
      photos: photosBySouvenir.get(record.id) ?? [],
    };
  });
}

export async function listSouvenirsForSession(
  sessionId: string,
): Promise<SouvenirSnapshot[]> {
  const membership = await requireCoupleMembership(sessionId);
  return toSnapshots(membership.id, sessionId);
}

export async function createSouvenirForSession(
  sessionId: string,
  input: SouvenirCreateInput,
  now: number = Date.now(),
): Promise<SouvenirSnapshot> {
  const membership = await requireCompleteCouple(sessionId);

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
    const existingId = await findSouvenirIdByIdea(membership.id, idea.id);
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
    await createSouvenirRecord({
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
    const existingId = await findSouvenirIdByIdea(membership.id, idea.id);
    if (!existingId) throw error;
    return saveBodyOnSouvenir(
      membership.id,
      sessionId,
      existingId,
      input.body,
      now,
    );
  }

  const created = await findSnapshot(membership.id, sessionId, id);
  if (!created) {
    throw new HttpError(500, "Impossible d’enregistrer ce souvenir.");
  }
  return created;
}

async function saveBodyOnSouvenir(
  coupleId: string,
  sessionId: string,
  souvenirId: string,
  body: string | undefined,
  now: number,
): Promise<SouvenirSnapshot> {
  if (body) await upsertSouvenirNote(souvenirId, sessionId, body, now);

  const snapshot = await findSnapshot(coupleId, sessionId, souvenirId);
  if (!snapshot) {
    throw new HttpError(500, "Impossible d’enregistrer ce souvenir.");
  }
  return snapshot;
}

export type PhotoUpload = { bytes: Buffer };

/**
 * Ajoute des photos à un souvenir existant.
 * Le type réel est détecté côté serveur ; les quotas protègent la base.
 */
export async function addSouvenirPhotosForSession(
  sessionId: string,
  souvenirId: string,
  uploads: PhotoUpload[],
): Promise<SouvenirSnapshot> {
  const membership = await requireCompleteCouple(sessionId);

  if ((await getSouvenirCoupleId(souvenirId)) !== membership.id) {
    throw new HttpError(404, "Ce souvenir est introuvable.");
  }
  if (uploads.length === 0) {
    throw new HttpError(400, "Aucune photo à ajouter.");
  }

  const alreadyThere = await countSouvenirPhotosForSouvenir(souvenirId);
  if (alreadyThere + uploads.length > MAX_PHOTOS_PER_SOUVENIR) {
    throw new HttpError(
      409,
      `Un souvenir peut contenir au maximum ${MAX_PHOTOS_PER_SOUVENIR} photos.`,
    );
  }
  const coupleTotal = await countSouvenirPhotos(membership.id);
  if (coupleTotal + uploads.length > MAX_PHOTOS_PER_COUPLE) {
    throw new HttpError(
      409,
      `L’album est complet (${MAX_PHOTOS_PER_COUPLE} photos). Supprimez une photo pour en ajouter une autre.`,
    );
  }

  const validated = uploads.map((upload) => {
    if (upload.bytes.byteLength === 0) {
      throw new HttpError(400, "Ce fichier est vide.");
    }
    if (isPhotoTooLarge(upload.bytes.byteLength)) {
      throw new HttpError(413, "Cette photo est trop lourde (2,5 Mo maximum).");
    }
    const mime = detectImageMime(upload.bytes);
    if (!mime) {
      throw new HttpError(
        415,
        "Format d’image non reconnu. Utilisez JPEG, PNG ou WebP.",
      );
    }
    return { mime, bytes: upload.bytes };
  });

  for (const photo of validated) {
    await createSouvenirPhotoRecord({
      id: randomBytes(12).toString("hex"),
      souvenirId,
      sessionId,
      mime: photo.mime,
      data: photo.bytes,
    });
  }

  const snapshot = await findSnapshot(membership.id, sessionId, souvenirId);
  if (!snapshot) {
    throw new HttpError(500, "Impossible d’enregistrer ces photos.");
  }
  return snapshot;
}

/** Récupère les octets d'une photo, uniquement pour les membres du duo. */
export async function getSouvenirPhotoForSession(
  sessionId: string,
  photoId: string,
) {
  const membership = await requireCoupleMembership(sessionId);
  const photo = await getSouvenirPhotoForCouple(photoId, membership.id);
  if (!photo) {
    throw new HttpError(404, "Cette photo est introuvable.");
  }
  return photo;
}

/** Seul l'auteur de l'envoi peut supprimer sa photo. */
export async function deleteSouvenirPhotoForSession(
  sessionId: string,
  photoId: string,
): Promise<SouvenirSnapshot> {
  const membership = await requireCoupleMembership(sessionId);
  const photo = await getSouvenirPhotoForCouple(photoId, membership.id);
  if (!photo) {
    throw new HttpError(404, "Cette photo est introuvable.");
  }
  const deleted = await deleteSouvenirPhotoRecord(photoId, sessionId);
  if (!deleted) {
    throw new HttpError(
      403,
      "Seule la personne qui a envoyé cette photo peut la retirer.",
    );
  }
  const snapshot = await findSnapshot(membership.id, sessionId, photo.souvenirId);
  if (!snapshot) {
    throw new HttpError(404, "Ce souvenir est introuvable.");
  }
  return snapshot;
}

export async function saveSouvenirNoteForSession(
  sessionId: string,
  souvenirId: string,
  body: string,
  now: number = Date.now(),
): Promise<SouvenirSnapshot> {
  const membership = await requireCompleteCouple(sessionId);

  // L'appartenance est vérifiée côté serveur : un identifiant d'un autre duo
  // est traité comme inexistant, sans révéler son existence.
  if ((await getSouvenirCoupleId(souvenirId)) !== membership.id) {
    throw new HttpError(404, "Ce souvenir est introuvable.");
  }

  await upsertSouvenirNote(souvenirId, sessionId, body, now);

  const updated = (await toSnapshots(membership.id, sessionId)).find(
    (souvenir) => souvenir.id === souvenirId,
  );
  if (!updated) {
    throw new HttpError(404, "Ce souvenir est introuvable.");
  }
  return updated;
}
