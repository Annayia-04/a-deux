import { NextResponse } from "next/server";
import { authCookieSecret, googleConfig } from "@/lib/config";
import {
  enforceRateLimit,
  fail,
  HttpError,
} from "@/lib/http";
import { publicOrigin } from "@/lib/auth/origin";
import { isSecureRequest } from "@/lib/session";
import {
  createOAuthState,
  OAUTH_COOKIE,
  OAUTH_TTL_MS,
  pkceChallenge,
  sealOAuthState,
} from "@/lib/auth/state";
import { buildGoogleAuthorizationUrl } from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Démarre le flux Google : état signé, nonce et PKCE, puis redirection. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(request, "auth:google:start", 30, 60_000);

    const config = googleConfig();
    const secret = authCookieSecret();
    if (!config || !secret) {
      throw new HttpError(
        503,
        "La connexion Google n’est pas configurée sur ce serveur.",
      );
    }

    const native = new URL(request.url).searchParams.get("native") === "1";
    const state = createOAuthState("google", { native });
    const redirectUri = `${publicOrigin(request)}/api/auth/google/callback`;

    const authorizationUrl = buildGoogleAuthorizationUrl({
      clientId: config.clientId,
      redirectUri,
      state: state.state,
      nonce: state.nonce,
      codeChallenge: pkceChallenge(state.verifier),
    });

    const response = NextResponse.redirect(authorizationUrl, 302);
    response.cookies.set(OAUTH_COOKIE, sealOAuthState(state, secret), {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/api/auth",
      maxAge: Math.floor(OAUTH_TTL_MS / 1000),
    });
    response.headers.set("cache-control", "no-store, max-age=0");
    return response;
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    console.error("[auth] démarrage Google impossible :", error);
    return fail(500, "La connexion Google est indisponible.");
  }
}
