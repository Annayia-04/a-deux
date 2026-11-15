import "server-only";

import {
  requireCompleteCouple,
  requireCoupleMembership,
} from "@/lib/couple";
import {
  getLatestPartnerTapId,
  getTapReadCursor,
  insertTapRecord,
  listPartnerTapsAfter,
  purgeOldTapRecords,
  setTapReadCursor,
} from "@/lib/db";
import { HttpError } from "@/lib/http";
import { notifyPartnerOfTap } from "@/lib/push";
import type { TapSnapshot } from "@/lib/types";

const TAP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function sendTapForSession(
  sessionId: string,
  now: number = Date.now(),
): Promise<TapSnapshot> {
  const membership = await requireCompleteCouple(sessionId);

  await purgeOldTapRecords(now - TAP_RETENTION_MS);
  const id = await insertTapRecord(membership.id, sessionId, now);

  // Notification push de l'autre membre, sans bloquer plus de 4 secondes.
  await Promise.race([
    notifyPartnerOfTap(membership.id, sessionId),
    new Promise<void>((resolve) => setTimeout(resolve, 4000)),
  ]).catch(() => undefined);

  return { id, createdAt: now };
}

export async function getTapStateForSession(sessionId: string): Promise<{
  tap: TapSnapshot | null;
  unread: number;
}> {
  const membership = await requireCoupleMembership(sessionId);
  const cursor = await getTapReadCursor(membership.id, sessionId);
  const taps = await listPartnerTapsAfter(membership.id, sessionId, cursor);
  const latest = taps[0] ?? null;

  return {
    tap: latest ? { id: latest.id, createdAt: latest.createdAt } : null,
    unread: taps.length,
  };
}

export async function markTapSeenForSession(
  sessionId: string,
  tapId: number,
): Promise<void> {
  const membership = await requireCoupleMembership(sessionId);
  const latestPartnerTapId = await getLatestPartnerTapId(
    membership.id,
    sessionId,
  );

  // Un client ne peut pas avancer son curseur au-delà des taps réellement reçus.
  if (latestPartnerTapId === 0) return;
  const safeTapId = Math.min(tapId, latestPartnerTapId);
  if (safeTapId <= 0) {
    throw new HttpError(400, "Tap invalide.");
  }

  await setTapReadCursor(membership.id, sessionId, safeTapId);
}
