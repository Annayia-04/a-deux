import type { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import { countMatches } from "@/lib/recommend";
import { previewRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Compte les idées compatibles pendant que l'utilisateur compose ses filtres.
 * Endpoint public mais sans effet de bord et strictement limité en débit.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "preview", 60, 60_000);

    const { prefs } = await readJson(request, previewRequestSchema);
    return json({ count: countMatches(prefs) });
  } catch (error) {
    return apiError(error);
  }
}
