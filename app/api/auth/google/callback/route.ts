import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  claimAppSession,
  createAuthSession,
  deleteExpiredAuthSessions,
  setAppSession,
  upsertGoogleUser,
} from "@/lib/account-db";
import {
  ACCOUNT_COOKIE,
  ACCOUNT_TTL_MS,
  accountCookieOptions,
} from "@/lib/auth/account";
import {
  exchangeGoogleCode,
  GoogleAuthError,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { publicOrigin } from "@/lib/auth/origin";
import { OAUTH_COOKIE, openOAuthState } from "@/lib/auth/state";
import { authCookieSecret, googleConfig } from "@/lib/config";
import {
  createSessionAlias,
  resolveSessionId,
} from "@/lib/db";
import {
  enforceRateLimit,
  fail,
  HttpError,
} from "@/lib/http";
import {
  isSecureRequest,
  readTokenFromCookieStore,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import {
  generateSessionToken,
  hashToken,
} from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stateCookieOptions(request: Request) {
  return {
    httpOnly: true as const,
    secure: isSecureRequest(request),
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: 0,
  };
}

/** Retour utilisateur : jamais de détail technique dans l'URL. */
function backToApp(
  request: Request,
  notice: "ok" | "refus" | "etat" | "erreur",
): NextResponse {
  const response = NextResponse.redirect(
    `${publicOrigin(request)}/?compte=${notice}`,
    303,
  );
  response.cookies.set(OAUTH_COOKIE, "", stateCookieOptions(request));
  response.headers.set("cache-control", "no-store, max-age=0");
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(request, "auth:google:callback", 60, 60_000);

    const config = googleConfig();
    const secret = authCookieSecret();
    if (!config || !secret) {
      throw new HttpError(
        503,
        "La connexion Google n’est pas configurée sur ce serveur.",
      );
    }

    const url = new URL(request.url);
    if (url.searchParams.get("error")) return backToApp(request, "refus");

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const store = await cookies();
    const payload = openOAuthState(
      store.get(OAUTH_COOKIE)?.value,
      secret,
    );

    if (
      !code ||
      !returnedState ||
      !payload ||
      payload.provider !== "google" ||
      payload.state !== returnedState
    ) {
      return backToApp(request, "etat");
    }

    const redirectUri = `${publicOrigin(request)}/api/auth/google/callback`;
    const { idToken } = await exchangeGoogleCode({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code,
      codeVerifier: payload.verifier,
      redirectUri,
    });

    const identity = await verifyGoogleIdToken(idToken, {
      clientId: config.clientId,
      nonce: payload.nonce,
    });

    const user = await upsertGoogleUser(identity);

    // ---------------------------------------------------------------------
    // Liaison avec la session applicative (données dans PostgreSQL).
    // ---------------------------------------------------------------------
    const sessionToken = readTokenFromCookieStore(store);
    const currentSessionId = sessionToken
      ? await resolveSessionId(hashToken(sessionToken))
      : null;

    let canonicalSessionId = user.appSessionId;
    if (
      canonicalSessionId &&
      (await resolveSessionId(canonicalSessionId)) === null
    ) {
      // La session liée a été effacée entre-temps : on repart proprement.
      canonicalSessionId = null;
      await setAppSession(user.id, null);
    }

    if (!canonicalSessionId && currentSessionId) {
      canonicalSessionId = (await claimAppSession(user.id, currentSessionId))
        .appSessionId;
    }

    let aliasToken: string | null = null;
    if (canonicalSessionId && canonicalSessionId !== currentSessionId) {
      // Appareil secondaire : on émet un alias vers la session du compte,
      // sans copier ni déplacer les données.
      const alias = generateSessionToken();
      await createSessionAlias(alias.hash, canonicalSessionId, user.id);
      aliasToken = alias.token;
    }

    // Session de compte (identité) : jeton opaque, hash en base.
    const accountSession = generateSessionToken();
    await createAuthSession(user.id, accountSession.hash, ACCOUNT_TTL_MS);
    deleteExpiredAuthSessions().catch(() => {});

    const response = backToApp(request, "ok");
    response.cookies.set(
      ACCOUNT_COOKIE,
      accountSession.token,
      accountCookieOptions(request),
    );
    if (aliasToken) {
      response.cookies.set(
        SESSION_COOKIE,
        aliasToken,
        sessionCookieOptions(request),
      );
    }
    return response;
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return backToApp(request, "erreur");
    }
    if (error instanceof HttpError) {
      return fail(error.status, error.message);
    }
    // Aucun jeton, code ou secret dans les logs.
    console.error("[auth] callback Google en échec :", error);
    return backToApp(request, "erreur");
  }
}
