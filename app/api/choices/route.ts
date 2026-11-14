import type { NextResponse } from "next/server";
import { getChoiceSnapshot } from "@/lib/choice-service";
import {
  apiError,
  enforceRateLimit,
  HttpError,
  json,
} from "@/lib/http";
import { choiceCategorySchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Deck restant, likes et matchs d'une catégorie pour la session courante. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    enforceRateLimit(request, "choices:get", 120, 60_000, session.id);

    const rawCategory = new URL(request.url).searchParams.get("category");
    const category = choiceCategorySchema.safeParse(rawCategory);
    if (!category.success) {
      throw new HttpError(400, "Catégorie de choix invalide.");
    }

    return json(getChoiceSnapshot(session.id, category.data));
  } catch (error) {
    return apiError(error);
  }
}
