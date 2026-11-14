import type { NextResponse } from "next/server";
import { markChoiceMatchesSeenForSession } from "@/lib/choice-service";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import { choiceSeenSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Marque les matchs d'une catégorie comme vus par la session courante. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "choices:seen", 30, 60_000, session.id);

    const { category } = await readJson(request, choiceSeenSchema);
    const unread = markChoiceMatchesSeenForSession(session.id, category);
    return json({ ok: true, unread });
  } catch (error) {
    return apiError(error);
  }
}
