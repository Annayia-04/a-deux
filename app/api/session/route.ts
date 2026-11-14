import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { reconcileMatchesForSession } from "@/lib/couple";
import {
  createSessionRecord,
  deleteExpiredSessions,
  deleteSessionRecord,
  getSessionRecord,
  resetSessionRecord,
} from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { rankIdeas } from "@/lib/recommend";
import { sessionRequestSchema } from "@/lib/schemas";
import {
  readTokenFromCookieStore,
  SESSION_COOKIE,
  sessionCookieOptions,
  SESSION_TTL_MS,
} from "@/lib/session";
import {
  generateSessionToken,
  hashToken,
  isValidSessionToken,
} from "@/lib/session-token";
import { loadSessionByToken, toPublicSnapshot } from "@/lib/snapshot";
import type { SessionSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "session:create", 12, 60_000);

    const { prefs } = await readJson(request, sessionRequestSchema);

    // Le seed rend l'ordre du deck stable pour toute la session.
    const seed = randomBytes(8).toString("hex");
    const ranked = rankIdeas(prefs, seed);

    if (ranked.length === 0) {
      throw new HttpError(
        422,
        "Aucune idée ne correspond à ces critères. Élargissez un filtre.",
      );
    }

    const store = await cookies();
    const previousToken = readTokenFromCookieStore(store);
    const previousRecord =
      previousToken && isValidSessionToken(previousToken)
        ? getSessionRecord(hashToken(previousToken))
        : null;

    // Une nouvelle sélection remplace les swipes mais conserve la session,
    // donc l'appartenance à un espace à deux et les matchs déjà obtenus.
    if (previousToken && previousRecord) {
      resetSessionRecord(previousRecord.id, prefs, seed);
      reconcileMatchesForSession(previousRecord.id);

      const session = loadSessionByToken(previousToken);
      if (!session) {
        throw new HttpError(500, "Impossible de recharger votre sélection.");
      }

      const response = json(toPublicSnapshot(session), 201);
      response.cookies.set(
        SESSION_COOKIE,
        previousToken,
        sessionCookieOptions(request),
      );
      return response;
    }

    const { token, hash } = generateSessionToken();
    createSessionRecord(hash, prefs, seed);
    deleteExpiredSessions(SESSION_TTL_MS);

    const snapshot: SessionSnapshot = {
      prefs,
      ideas: ranked,
      likedIdeas: [],
      total: ranked.length,
      swiped: 0,
      couple: null,
    };
    const response = json(snapshot, 201);
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "session:delete", 20, 60_000);

    const store = await cookies();
    const token = readTokenFromCookieStore(store);
    if (token) deleteSessionRecord(hashToken(token));

    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(request),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
