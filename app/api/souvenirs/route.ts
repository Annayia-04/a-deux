import type { NextResponse } from "next/server";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
} from "@/lib/http";
import { souvenirCreateSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";
import {
  createSouvenirForSession,
  listSouvenirsForSession,
} from "@/lib/souvenirs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Timeline des souvenirs du duo de la session courante. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    enforceRateLimit(request, "souvenirs:get", 60, 60_000, session.id);
    return json({ souvenirs: listSouvenirsForSession(session.id) });
  } catch (error) {
    return apiError(error);
  }
}

/** Crée un souvenir, éventuellement lié à une idée aimée en commun. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    enforceRateLimit(request, "souvenirs:create", 20, 60_000, session.id);
    const input = await readJson(request, souvenirCreateSchema);

    const souvenir = createSouvenirForSession(session.id, input);
    return json({ souvenir }, 201);
  } catch (error) {
    return apiError(error);
  }
}
