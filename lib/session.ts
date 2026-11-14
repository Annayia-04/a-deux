import "server-only";

import { cookies } from "next/headers";
import { getSessionRecord, resolveSessionId, touchSession } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { prefsSchema } from "@/lib/schemas";
import {
  hashToken,
  isValidSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/session-token";
import type { Prefs } from "@/lib/types";

export { SESSION_COOKIE, SESSION_TTL_MS };

export type ActiveSession = {
  id: string;
  prefs: Prefs;
  seed: string;
};

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

/**
 * `Secure` est déduit du protocole réel (ou de `COOKIE_SECURE`), pour que
 * `next start` reste testable en HTTP local tout en étant strict en production.
 */
export function isSecureRequest(request?: Request): boolean {
  const override = process.env.COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;

  if (request) {
    const forwarded = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    if (forwarded) return forwarded === "https";
    try {
      return new URL(request.url).protocol === "https:";
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(request?: Request): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function readTokenFromCookieStore(
  store: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const token = store.get(SESSION_COOKIE)?.value;
  return token && isValidSessionToken(token) ? token : null;
}

/** Récupère la session active ou lève une 401 exploitable par les routes API. */
export async function requireSession(): Promise<ActiveSession> {
  const store = await cookies();
  const token = readTokenFromCookieStore(store);

  if (!token) {
    throw new HttpError(401, "Session introuvable. Relancez votre sélection.");
  }

  const sessionId = await resolveSessionId(hashToken(token));
  if (!sessionId) {
    throw new HttpError(401, "Session expirée. Relancez votre sélection.");
  }

  const record = await getSessionRecord(sessionId);
  if (!record) {
    throw new HttpError(401, "Session expirée. Relancez votre sélection.");
  }

  let parsedPrefs: unknown;
  try {
    parsedPrefs = JSON.parse(record.prefs);
  } catch {
    throw new HttpError(401, "Session invalide. Relancez votre sélection.");
  }

  const prefs = prefsSchema.safeParse(parsedPrefs);
  if (!prefs.success) {
    throw new HttpError(401, "Session invalide. Relancez votre sélection.");
  }

  // Mise à jour opportuniste, sans bloquer la réponse en cas d'échec.
  try {
    await touchSession(record.id);
  } catch {
    // non critique
  }

  return { id: record.id, prefs: prefs.data, seed: record.seed };
}
