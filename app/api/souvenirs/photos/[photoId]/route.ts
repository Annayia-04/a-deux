import { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  HttpError,
  json,
} from "@/lib/http";
import { souvenirPhotoIdSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";
import {
  deleteSouvenirPhotoForSession,
  getSouvenirPhotoForSession,
} from "@/lib/souvenirs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sert une photo uniquement aux deux membres du duo, sans URL publique. */
export async function GET(
  request: Request,
  context: { params: Promise<{ photoId: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    enforceRateLimit(request, "souvenir:photo", 300, 60_000, session.id);

    const { photoId } = await context.params;
    const parsedId = souvenirPhotoIdSchema.safeParse(photoId);
    if (!parsedId.success) {
      throw new HttpError(400, "Identifiant de photo invalide.");
    }

    const photo = await getSouvenirPhotoForSession(session.id, parsedId.data);
    const body = new Uint8Array(photo.data);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": photo.mime,
        "content-length": String(photo.byteSize),
        "content-disposition": "inline",
        "cache-control": "private, max-age=31536000, immutable",
        vary: "cookie",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ photoId: string }> },
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "souvenir:photo:delete", 30, 60_000, session.id);

    const { photoId } = await context.params;
    const parsedId = souvenirPhotoIdSchema.safeParse(photoId);
    if (!parsedId.success) {
      throw new HttpError(400, "Identifiant de photo invalide.");
    }

    const souvenir = await deleteSouvenirPhotoForSession(
      session.id,
      parsedId.data,
    );
    return json({ souvenir });
  } catch (error) {
    return apiError(error);
  }
}
