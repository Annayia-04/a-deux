import type { NextResponse } from "next/server";
import { reconcileMatchForSession } from "@/lib/couple";
import { undoLastSwipe } from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
} from "@/lib/http";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "swipe:undo", 60, 60_000, session.id);

    const ideaId = await undoLastSwipe(session.id);
    if (!ideaId) {
      return json({ ok: false, error: "Aucune carte à annuler." }, 409);
    }

    await reconcileMatchForSession(session.id, ideaId);

    return json({ ok: true, ideaId });
  } catch (error) {
    return apiError(error);
  }
}
