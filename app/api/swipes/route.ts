import type { NextResponse } from "next/server";
import {
  reconcileMatchForSession,
  recordMutualMatchForSession,
} from "@/lib/couple";
import { addSwipe, countSwipes, listSwipes, removeSwipe } from "@/lib/db";
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
import { swipeRemoveSchema, swipeSchema } from "@/lib/schemas";
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

/** Idées passées, pour l'écran « Revoir les idées passées ». */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    enforceRateLimit(request, "swipe:list", 60, 60_000, session.id);

    const swipes = await listSwipes(session.id);
    const passed = swipes
      .filter((swipe) => swipe.direction === "pass")
      .map((swipe) => IDEAS_BY_ID.get(swipe.ideaId))
      .filter((idea): idea is NonNullable<typeof idea> => Boolean(idea));

    return json({ passed });
  } catch (error) {
    return apiError(error);
  }
}

/** Retire une envie gardée (ou un ancien « passer »). */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "swipe:remove", 60, 60_000, session.id);

    const { ideaId } = await readJson(request, swipeRemoveSchema);
    const removed = await removeSwipe(session.id, ideaId);
    if (!removed) {
      throw new HttpError(404, "Cette envie n’est plus dans votre liste.");
    }

    // Un match commun ne tient que si les deux likes existent encore.
    await reconcileMatchForSession(session.id, ideaId);

    return json({ ok: true, swiped: await countSwipes(session.id) });
  } catch (error) {
    return apiError(error);
  }
}
