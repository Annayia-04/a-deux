import type { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import { tapSeenSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";
import { markTapSeenForSession } from "@/lib/taps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Avance le curseur de lecture des taps de la session courante. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "taps:seen", 60, 60_000, session.id);

    const { tapId } = await readJson(request, tapSeenSchema);
    markTapSeenForSession(session.id, tapId);
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
