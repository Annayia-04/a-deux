import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  claimAppSession,
  createAuthSession,
  deleteExpiredAuthSessions,
  findUserById,
  setAppSession,
} from "@/lib/account-db";
import {
  ACCOUNT_COOKIE,
  ACCOUNT_TTL_MS,
  accountCookieOptions,
} from "@/lib/auth/account";
import { consumeAuthHandoff } from "@/lib/auth/handoff";
import { createSessionAlias, resolveSessionId } from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { nativeAuthExchangeSchema } from "@/lib/schemas";
import {
  readTokenFromCookieStore,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { generateSessionToken, hashToken } from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Échange le code renvoyé par le flux Google natif contre les cookies de
 * session de la WebView. Le code est à usage unique et expire en deux minutes.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "auth:native:exchange", 30, 60_000);

    const { code } = await readJson(request, nativeAuthExchangeSchema);
    const userId = await consumeAuthHandoff(code);
    if (!userId) {
      throw new HttpError(
        400,
        "Ce lien de connexion a expiré. Recommencez la connexion.",
      );
    }

    const user = await findUserById(userId);
    if (!user) {
      throw new HttpError(400, "Ce compte est introuvable.");
    }

    const store = await cookies();
    const sessionToken = readTokenFromCookieStore(store);
    const currentSessionId = sessionToken
      ? await resolveSessionId(hashToken(sessionToken))
      : null;

    let canonicalSessionId = user.appSessionId;
    if (
      canonicalSessionId &&
      (await resolveSessionId(canonicalSessionId)) === null
    ) {
      canonicalSessionId = null;
      await setAppSession(user.id, null);
    }

    if (!canonicalSessionId && currentSessionId) {
      canonicalSessionId = (
        await claimAppSession(user.id, currentSessionId)
      ).appSessionId;
    }

    let aliasToken: string | null = null;
    if (canonicalSessionId && canonicalSessionId !== currentSessionId) {
      // La WebView n'a pas encore la session du compte : on émet un alias.
      const alias = generateSessionToken();
      await createSessionAlias(alias.hash, canonicalSessionId, user.id);
      aliasToken = alias.token;
    }

    const accountSession = generateSessionToken();
    await createAuthSession(user.id, accountSession.hash, ACCOUNT_TTL_MS);
    deleteExpiredAuthSessions().catch(() => undefined);

    const response = json({ ok: true });
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
    return apiError(error);
  }
}
