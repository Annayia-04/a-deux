import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeAuthSession } from "@/lib/account-db";
import {
  ACCOUNT_COOKIE,
  accountCookieOptions,
  currentAccount,
  readAccountToken,
  toAccountSnapshot,
} from "@/lib/auth/account";
import { enabledAuthProviders } from "@/lib/config";
import {
  deleteSessionAlias,
  isSessionAlias,
} from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
} from "@/lib/http";
import {
  readTokenFromCookieStore,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { hashToken } from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(request, "account:read", 120, 60_000);
    const account = await currentAccount();
    return json({
      account: account ? toAccountSnapshot(account) : null,
      providers: enabledAuthProviders(),
    });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Déconnexion : révoque la session de compte et efface son cookie.
 * Si l'appareil utilisait un alias, l'alias est supprimé ; la session
 * canonique (et donc les données du duo) reste intacte pour les autres
 * appareils du compte. Si le cookie est la session canonique, elle est
 * conservée : on redevient simplement anonyme, sans rien perdre.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "account:delete", 20, 60_000);

    const store = await cookies();
    const accountToken = readAccountToken(store);
    if (accountToken) {
      await revokeAuthSession(hashToken(accountToken));
    }

    const sessionToken = readTokenFromCookieStore(store);
    let clearSession = false;
    if (sessionToken) {
      const sessionId = hashToken(sessionToken);
      if (await isSessionAlias(sessionId)) {
        await deleteSessionAlias(sessionId);
        clearSession = true;
      }
    }

    const response = json({ ok: true });
    response.cookies.set(ACCOUNT_COOKIE, "", {
      ...accountCookieOptions(request),
      maxAge: 0,
    });
    if (clearSession) {
      response.cookies.set(SESSION_COOKIE, "", {
        ...sessionCookieOptions(request),
        maxAge: 0,
      });
    }
    return response;
  } catch (error) {
    return apiError(error);
  }
}
