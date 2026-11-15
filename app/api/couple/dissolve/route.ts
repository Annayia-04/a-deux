import type { NextResponse } from "next/server";
import { dissolveCoupleForSession } from "@/lib/couple";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
} from "@/lib/http";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Supprime définitivement la room et tout son contenu partagé. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "couple:dissolve", 5, 60_000, session.id);

    await dissolveCoupleForSession(session.id);
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
