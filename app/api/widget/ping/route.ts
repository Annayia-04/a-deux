import type { NextResponse } from "next/server";
import {
  apiError,
  enforceRateLimit,
  HttpError,
  json,
} from "@/lib/http";
import {
  resolveWidgetDevice,
  sendWidgetPingForDevice,
} from "@/lib/widgets";import { readWidgetToken } from "@/lib/widget-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Envoi d'un « petit ping » depuis un widget natif, application fermée.
 *
 * Authentification par jeton d'appareil uniquement (aucun cookie) : cette
 * route n'accepte donc pas de requête navigateur, et l'absence de cookie
 * rend le CSRF inopérant. Le jeton est limité à l'envoi d'un tap.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const token = readWidgetToken(request);
    if (!token) {
      throw new HttpError(
        401,
        "Widget non reconnu. Réassociez-le depuis l’application.",
      );
    }

    const device = await resolveWidgetDevice(token);
    enforceRateLimit(request, "widget:ping", 1, 8_000, device.tokenHash);
    enforceRateLimit(request, "widget:hour", 20, 3_600_000, device.tokenHash);

    const tap = await sendWidgetPingForDevice(device);
    return json({ tap }, 201);
  } catch (error) {
    return apiError(error);
  }
}
