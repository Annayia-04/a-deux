import "server-only";

import { cookies } from "next/headers";
import { readAuthSession, type AccountUser } from "@/lib/account-db";
import { isSecureRequest } from "@/lib/session";
import {
  hashToken,
  isValidSessionToken,
  SESSION_TTL_MS,
} from "@/lib/session-token";
import type { AccountSnapshot } from "@/lib/types";

/**
 * Cookie de compte, distinct du cookie de session anonyme :
 * - `date_swipe_session` porte les données (préférences, duo, swipes) ;
 * - `adeux_account` prouve l'identité et permet de retrouver la session
 *   canonique du compte sur un autre appareil.
 * Les deux sont HttpOnly et ne contiennent qu'un jeton opaque.
 */
export const ACCOUNT_COOKIE = "adeux_account";
export const ACCOUNT_TTL_MS = SESSION_TTL_MS;

export function accountCookieOptions(request?: Request) {
  return {
    httpOnly: true as const,
    secure: isSecureRequest(request),
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(ACCOUNT_TTL_MS / 1000),
  };
}

export function readAccountToken(
  store: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const token = store.get(ACCOUNT_COOKIE)?.value;
  return token && isValidSessionToken(token) ? token : null;
}

/**
 * Résout un jeton de compte. Toute erreur (base absente, réseau) renvoie
 * `null` : l'application continue en mode anonyme plutôt que de casser.
 */
export async function getAccountByToken(
  token: string | null,
): Promise<AccountUser | null> {
  if (!token || !isValidSessionToken(token)) return null;
  try {
    const session = await readAuthSession(hashToken(token));
    if (!session) return null;
    return {
      id: session.id,
      displayName: session.displayName,
      email: session.email,
      appSessionId: session.appSessionId,
    };
  } catch {
    return null;
  }
}

/** Compte courant, ou `null` si le visiteur est anonyme / hors configuration. */
export async function currentAccount(): Promise<AccountUser | null> {
  const store = await cookies();
  return getAccountByToken(readAccountToken(store));
}

export function toAccountSnapshot(user: AccountUser): AccountSnapshot {
  return { displayName: user.displayName, email: user.email };
}
