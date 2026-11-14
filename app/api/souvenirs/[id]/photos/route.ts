import type { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  HttpError,
  json,
} from "@/lib/http";
import { souvenirIdSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";
import { addSouvenirPhotosForSession } from "@/lib/souvenirs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES_PER_REQUEST = 6;

/**
 * Ajoute des photos à un souvenir (multipart/form-data).
 *
 * Les images sont déjà compressées par le client ; le serveur revalide le
 * type réel, la taille et les quotas avant de stocker dans PostgreSQL.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "souvenir:photos", 20, 60_000, session.id);

    const { id } = await context.params;
    const parsedId = souvenirIdSchema.safeParse(id);
    if (!parsedId.success) {
      throw new HttpError(400, "Identifiant de souvenir invalide.");
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      throw new HttpError(400, "Envoi de photos invalide.");
    }

    const files = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      throw new HttpError(400, "Aucune photo à ajouter.");
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      throw new HttpError(
        400,
        `Envoyez au maximum ${MAX_FILES_PER_REQUEST} photos à la fois.`,
      );
    }

    const uploads = [];
    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      uploads.push({ bytes });
    }

    const souvenir = await addSouvenirPhotosForSession(
      session.id,
      parsedId.data,
      uploads,
    );

    return json({ souvenir }, 201);
  } catch (error) {
    return apiError(error);
  }
}
