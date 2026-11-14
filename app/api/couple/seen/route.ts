import type { NextResponse } from "next/server";
import { markCoupleMatchesSeen } from "@/lib/couple";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  HttpError,
  json,
} from "@/lib/http";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Marque tous les matchs du duo comme vus pour la session courante. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "couple:seen", 60, 60_000, session.id);

    const couple = await markCoupleMatchesSeen(session.id);
    if (!couple) {
      throw new HttpError(409, "Vous ne faites partie d’aucun duo.");
    }

    return json({ couple });
  } catch (error) {
    return apiError(error);
  }
}
