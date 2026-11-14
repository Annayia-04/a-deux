import type { NextResponse } from "next/server";
import { recordMutualMatchForSession } from "@/lib/couple";
import { addSwipe, countSwipes } from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { IDEAS_BY_ID } from "@/lib/ideas";
import { matchesPrefs } from "@/lib/recommend";
import { swipeSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "swipe", 180, 60_000, session.id);

    const { ideaId, direction } = await readJson(request, swipeSchema);

    const idea = IDEAS_BY_ID.get(ideaId);
    if (!idea) throw new HttpError(404, "Idée inconnue.");

    // Empêche d'enregistrer une carte qui ne fait pas partie de la sélection.
    if (!matchesPrefs(idea, session.prefs)) {
      throw new HttpError(422, "Cette idée ne correspond pas à votre sélection.");
    }

    await addSwipe(session.id, ideaId, direction);
    const match =
      direction === "like"
        ? await recordMutualMatchForSession(session.id, idea)
        : null;

    return json({
      ok: true,
      swiped: await countSwipes(session.id),
      ...(match ? { match } : {}),
    });
  } catch (error) {
    return apiError(error);
  }
}
