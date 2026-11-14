import type { NextResponse } from "next/server";
import { joinCoupleForSession } from "@/lib/couple";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import { coupleJoinSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rejoint l'espace à deux d'un partenaire à partir de son code d'invitation. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();

    // Deux limites : par session et par IP, pour freiner les essais de codes.
    enforceRateLimit(request, "couple:join", 12, 60_000, session.id);
    enforceRateLimit(request, "couple:join:ip", 30, 60_000);

    const { code } = await readJson(request, coupleJoinSchema);
    const couple = await joinCoupleForSession(code, session.id);

    return json({ couple });
  } catch (error) {
    return apiError(error);
  }
}
