import type { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { souvenirIdSchema, souvenirNoteSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";
import { saveSouvenirNoteForSession } from "@/lib/souvenirs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Enregistre ou modifie le moment préféré de la session courante. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "souvenirs:note", 20, 60_000, session.id);

    const { id } = await params;
    const parsedId = souvenirIdSchema.safeParse(id);
    if (!parsedId.success) {
      throw new HttpError(404, "Ce souvenir est introuvable.");
    }

    const { body } = await readJson(request, souvenirNoteSchema);
    const souvenir = saveSouvenirNoteForSession(session.id, parsedId.data, body);
    return json({ souvenir });
  } catch (error) {
    return apiError(error);
  }
}
