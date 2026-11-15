import type { NextResponse } from "next/server";
import { upsertPushDevice, deletePushDevice } from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import {
  pushDeviceDeleteSchema,
  pushDeviceSchema,
} from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Enregistre le jeton FCM de l'appareil courant. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "push:register", 30, 60_000, session.id);

    const input = await readJson(request, pushDeviceSchema);
    await upsertPushDevice(input.token, session.id, input.platform);
    return json({ ok: true }, 201);
  } catch (error) {
    return apiError(error);
  }
}

/** Retire le jeton (déconnexion, désinstallation, refus des notifications). */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "push:unregister", 30, 60_000, session.id);

    const { token } = await readJson(request, pushDeviceDeleteSchema);
    await deletePushDevice(token, session.id);
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
