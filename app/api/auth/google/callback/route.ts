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
import { createAuthHandoff } from "@/lib/auth/handoff";
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

type Notice = "ok" | "refus" | "etat" | "erreur";

function finish(response: NextResponse, request: Request): NextResponse {
  response.cookies.set(OAUTH_COOKIE, "", stateCookieOptions(request));
  response.headers.set("cache-control", "no-store, max-age=0");
  return response;
}

/** Retour utilisateur web : jamais de détail technique dans l'URL. */
function backToApp(request: Request, notice: Notice): NextResponse {
  return finish(
    NextResponse.redirect(`${publicOrigin(request)}/?compte=${notice}`, 303),
    request,
  );
}

/** Retour application native : deep link avec un code à usage unique. */
function backToNative(notice: Notice, code: string | undefined, request: Request): NextResponse {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  else params.set("error", notice);
  return finish(
    NextResponse.redirect(`fr.adeux.app://auth?${params.toString()}`, 303),
    request,
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  let native = false;
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
    const store = await cookies();
    const payload = openOAuthState(store.get(OAUTH_COOKIE)?.value, secret);
    native = payload?.native === true;

    if (url.searchParams.get("error")) {
      return native ? backToNative("refus", undefined, request) : backToApp(request, "refus");
    }

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    if (
      !code ||
      !returnedState ||
      !payload ||
      payload.provider !== "google" ||
      payload.state !== returnedState
    ) {
      return native ? backToNative("etat", undefined, request) : backToApp(request, "etat");
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

    // Application native : le code est échangé par la WebView contre sa session.
    if (native) {
      const handoff = await createAuthHandoff(user.id);
      return backToNative("ok", handoff, request);
    }

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
      return native ? backToNative("erreur", undefined, request) : backToApp(request, "erreur");
    }
    if (error instanceof HttpError) {
      return native
        ? backToNative("erreur", undefined, request)
        : fail(error.status, error.message);
    }
    // Aucun jeton, code ou secret dans les logs.
    console.error("[auth] callback Google en échec :", error);
    return native ? backToNative("erreur", undefined, request) : backToApp(request, "erreur");
  }
}
