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
import type { TapSnapshot } from "@/lib/types";

const TAP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export function sendTapForSession(
  sessionId: string,
  now: number = Date.now(),
): TapSnapshot {
  const membership = requireCompleteCouple(sessionId);

  purgeOldTapRecords(now - TAP_RETENTION_MS);
  const id = insertTapRecord(membership.id, sessionId, now);
  return { id, createdAt: now };
}

export function getTapStateForSession(sessionId: string): {
  tap: TapSnapshot | null;
  unread: number;
} {
  const membership = requireCoupleMembership(sessionId);
  const cursor = getTapReadCursor(membership.id, sessionId);
  const taps = listPartnerTapsAfter(membership.id, sessionId, cursor);
  const latest = taps[0] ?? null;

  return {
    tap: latest ? { id: latest.id, createdAt: latest.createdAt } : null,
    unread: taps.length,
  };
}

export function markTapSeenForSession(
  sessionId: string,
  tapId: number,
): void {
  const membership = requireCoupleMembership(sessionId);
  const latestPartnerTapId = getLatestPartnerTapId(membership.id, sessionId);

  // Un client ne peut pas avancer son curseur au-delà des taps réellement reçus.
  if (latestPartnerTapId === 0) return;
  const safeTapId = Math.min(tapId, latestPartnerTapId);
  if (safeTapId <= 0) {
    throw new HttpError(400, "Tap invalide.");
  }

  setTapReadCursor(membership.id, sessionId, safeTapId);
}
