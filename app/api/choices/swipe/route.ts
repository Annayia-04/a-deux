import type { NextResponse } from "next/server";
import { swipeChoiceForSession } from "@/lib/choice-service";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import { choiceSwipeSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Like ou pass sur une carte Nourriture / Films. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "choices:swipe", 60, 60_000, session.id);

    const input = await readJson(request, choiceSwipeSchema);
    const match = await swipeChoiceForSession(
      session.id,
      input.category,
      input.choiceId,
      input.direction,
    );

    return json({ ok: true, match });
  } catch (error) {
    return apiError(error);
  }
}
