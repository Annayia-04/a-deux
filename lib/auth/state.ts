import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Cookie d'état OAuth : contient le `state`, le `nonce` et le vérificateur
 * PKCE pendant la durée de l'aller-retour chez Google. Signé en HMAC-SHA256
 * avec `APP_SESSION_SECRET`, il ne peut être ni lu utilement ni forgé par un
 * client qui ne possède pas le secret.
 */

export const OAUTH_COOKIE = "adeux_oauth";
export const OAUTH_TTL_MS = 10 * 60 * 1000;

export type OAuthStatePayload = {
  provider: "google" | "apple";
  state: string;
  nonce: string;
  verifier: string;
  iat: number;
  /** Lancement depuis l'application native : retour par deep link. */
  native?: boolean;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createOAuthState(
  provider: OAuthStatePayload["provider"],
  options: { native?: boolean } = {},
): OAuthStatePayload {
  return {
    provider,
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    iat: Date.now(),
    ...(options.native ? { native: true } : {}),
  };
}

export function sealOAuthState(
  payload: OAuthStatePayload,
  secret: string,
): string {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function openOAuthState(
  value: string | null | undefined,
  secret: string,
  options: { now?: number; maxAgeMs?: number } = {},
): OAuthStatePayload | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(body, secret);

  const provided = Buffer.from(signature);
  const reference = Buffer.from(expected);
  if (
    provided.length !== reference.length ||
    !timingSafeEqual(provided, reference)
  ) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as Partial<OAuthStatePayload>;
  if (
    (payload.provider !== "google" && payload.provider !== "apple") ||
    typeof payload.state !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.verifier !== "string" ||
    typeof payload.iat !== "number"
  ) {
    return null;
  }

  const now = options.now ?? Date.now();
  const maxAge = options.maxAgeMs ?? OAUTH_TTL_MS;
  if (!Number.isFinite(payload.iat) || now - payload.iat > maxAge) return null;
  if (payload.iat > now + 60_000) return null;

  return {
    ...(payload as OAuthStatePayload),
    ...(payload.native === true ? { native: true } : {}),
  };
}

/** Challenge PKCE S256 : base64url(SHA-256(verifier)). */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
