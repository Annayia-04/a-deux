import type { NextResponse } from "next/server";
import {
  apiError,
  enforceRateLimit,
  HttpError,
  json,
} from "@/lib/http";
import { readWidgetToken } from "@/lib/widget-token";
import { resolveWidgetDevice } from "@/lib/widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vérifie qu'un jeton d'appareil est toujours valide, sans envoyer de ping.
 *
 * Utilisé par l'application native au démarrage : si le jeton stocké a été
 * révoqué, ou si la base a été recréée, l'appareil est réassocié au lieu de
 * laisser un widget définitivement muet. Aucun cookie, donc pas de CSRF.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const token = readWidgetToken(request);
    if (!token) {
      throw new HttpError(
        401,
        "Widget non reconnu. Réassociez-le depuis l’application.",
      );
    }

    // Validation avant quota : un jeton inconnu reçoit 401, jamais 429.
    const device = await resolveWidgetDevice(token);
    enforceRateLimit(request, "widget:status", 30, 60_000, device.tokenHash);

    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
