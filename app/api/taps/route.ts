import type { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
} from "@/lib/http";
import { requireSession } from "@/lib/session";
import { getTapStateForSession, sendTapForSession } from "@/lib/taps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dernier tap non lu envoyé par le partenaire. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    enforceRateLimit(request, "taps:get", 120, 60_000, session.id);
    return json(getTapStateForSession(session.id));
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Envoie une pensée. Une seule toutes les 8 secondes par session,
 * et 20 par heure pour éviter le spam.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "taps:send", 1, 8_000, session.id);
    enforceRateLimit(request, "taps:hour", 20, 3_600_000, session.id);

    const tap = sendTapForSession(session.id);
    return json({ tap }, 201);
  } catch (error) {
    return apiError(error);
  }
}
