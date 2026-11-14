import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  claimAppSession,
  setAppSession,
} from "@/lib/account-db";
import {
  getAccountByToken,
  readAccountToken,
} from "@/lib/auth/account";
import { reconcileMatchesForSession } from "@/lib/couple";
import {
  createSessionAlias,
  createSessionRecord,
  deleteExpiredSessions,
  deleteSessionRecord,
  getSessionRecord,
  resetSessionRecord,
  resolveSessionId,
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
    const previousId =
      previousToken && isValidSessionToken(previousToken)
        ? await resolveSessionId(hashToken(previousToken))
        : null;
    const previousRecord = previousId ? await getSessionRecord(previousId) : null;

    // Une nouvelle sélection remplace les swipes mais conserve la session,
    // donc l'appartenance à un espace à deux et les matchs déjà obtenus.
    if (previousToken && previousRecord) {
      await resetSessionRecord(previousRecord.id, prefs, seed);
      await reconcileMatchesForSession(previousRecord.id);

      const session = await loadSessionByToken(previousToken);
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

    const account = await getAccountByToken(readAccountToken(store));

    // Compte connecté dont la session canonique existe encore, mais dont le
    // cookie de session a disparu (nettoyage partiel du navigateur) : on
    // rattache cet appareil à la session du compte par un alias, et la
    // nouvelle sélection s'applique à cette session partagée.
    if (account?.appSessionId) {
      const canonicalId = await resolveSessionId(account.appSessionId);
      if (canonicalId) {
        await resetSessionRecord(canonicalId, prefs, seed);
        await reconcileMatchesForSession(canonicalId);

        const alias = generateSessionToken();
        await createSessionAlias(alias.hash, canonicalId, account.id);

        const session = await loadSessionByToken(alias.token);
        if (!session) {
          throw new HttpError(500, "Impossible de recharger votre sélection.");
        }

        const response = json(toPublicSnapshot(session), 201);
        response.cookies.set(
          SESSION_COOKIE,
          alias.token,
          sessionCookieOptions(request),
        );
        return response;
      }
    }

    const { token, hash } = generateSessionToken();
    await createSessionRecord(hash, prefs, seed);
    await deleteExpiredSessions(SESSION_TTL_MS);

    // Connexion effectuée avant la création de la sélection : la session
    // naissante devient la session canonique du compte.
    if (account && !account.appSessionId) {
      await claimAppSession(account.id, hash).catch(() => {});
    }

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
    if (token) {
      const sessionId = await resolveSessionId(hashToken(token));
      if (sessionId) {
        const account = await getAccountByToken(readAccountToken(store));
        if (account?.appSessionId === sessionId) {
          await setAppSession(account.id, null).catch(() => {});
        }
        await deleteSessionRecord(sessionId);
      }
    }

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
