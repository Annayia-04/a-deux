import type { NextResponse } from "next/server";
import {
  createCoupleForSession,
  getCoupleSnapshot,
  leaveCoupleForSession,
} from "@/lib/couple";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
} from "@/lib/http";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** État de l'espace à deux : membres, code et matchs. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    enforceRateLimit(request, "couple:get", 120, 60_000, session.id);
    return json({ couple: getCoupleSnapshot(session.id) });
  } catch (error) {
    return apiError(error);
  }
}

/** Crée un espace à deux et y rattache la session courante. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "couple:create", 8, 60_000, session.id);

    const couple = createCoupleForSession(session.id);
    return json({ couple }, 201);
  } catch (error) {
    return apiError(error);
  }
}

/** Quitte l'espace à deux. Les matchs partagés sont supprimés. */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "couple:leave", 20, 60_000, session.id);

    leaveCoupleForSession(session.id);
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
