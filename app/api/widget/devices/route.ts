import type { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import { widgetPairSchema, widgetRevokeSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";
import { pairWidgetForSession, revokeWidgetForSession } from "@/lib/widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Associe un nouvel appareil widget à la session courante.
 * Le jeton est renvoyé une seule fois : le téléphone doit le stocker dans son
 * stockage natif. Il ne donne accès qu'à l'envoi d'un petit ping.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "widget:pair", 10, 60_000, session.id);

    const { label } = await readJson(request, widgetPairSchema);
    const token = await pairWidgetForSession(session.id, label ?? null);
    return json({ token }, 201);
  } catch (error) {
    return apiError(error);
  }
}

/** Révoque un appareil appartenant à la session courante. */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "widget:revoke", 20, 60_000, session.id);

    const { token } = await readJson(request, widgetRevokeSchema);
    await revokeWidgetForSession(session.id, token);
    // Réponse identique que l'appareil existe ou non : pas d'oracle.
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
