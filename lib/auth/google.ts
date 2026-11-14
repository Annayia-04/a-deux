import { createPublicKey, verify as verifySignature } from "node:crypto";
import { sanitizePlainText } from "@/lib/text";

/**
 * Client Google OpenID Connect minimal, sans dépendance externe.
 * Tout se passe côté serveur : le code, le secret et l'id_token ne transitent
 * jamais par le navigateur.
 */

const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const JWKS_TTL_MS = 60 * 60 * 1000;

export class GoogleAuthError extends Error {
  constructor(message = "Connexion Google impossible.") {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export type GoogleJwk = {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
};

export type GoogleJwks = { keys: GoogleJwk[] };

export type GoogleIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

type JwtPayload = {
  iss?: string;
  aud?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
};

let jwksCache: { keys: GoogleJwk[]; expiresAt: number } | null = null;

export function resetJwksCache(): void {
  jwksCache = null;
}

async function fetchJwks(): Promise<GoogleJwk[]> {
  const response = await fetch(JWKS_ENDPOINT, {
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new GoogleAuthError();
  const data = (await response.json()) as GoogleJwks;
  if (!Array.isArray(data.keys)) throw new GoogleAuthError();
  return data.keys.filter((key) => key.kty === "RSA" && key.kid);
}

async function getJwks(forceRefresh = false): Promise<GoogleJwk[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }
  const keys = await fetchJwks();
  jwksCache = { keys, expiresAt: now + JWKS_TTL_MS };
  return keys;
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "online");
  return url.toString();
}

export async function exchangeGoogleCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ idToken: string }> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new GoogleAuthError();

  let data: { id_token?: unknown };
  try {
    data = (await response.json()) as { id_token?: unknown };
  } catch {
    throw new GoogleAuthError();
  }

  if (typeof data.id_token !== "string" || data.id_token.length === 0) {
    throw new GoogleAuthError();
  }
  return { idToken: data.id_token };
}

function decodeSegment(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Vérifie signature, émetteur, audience, expiration et nonce de l'id_token.
 * `jwks` et `now` sont injectables pour les tests, sans réseau.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  options: {
    clientId: string;
    nonce: string;
    jwks?: GoogleJwks;
    now?: number;
  },
): Promise<GoogleIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new GoogleAuthError();
  const [headerB64, payloadB64, signatureB64] = parts as [
    string,
    string,
    string,
  ];

  const header = decodeSegment(headerB64) as
    | { alg?: string; kid?: string }
    | null;
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new GoogleAuthError();
  }

  const keys = options.jwks?.keys ?? (await getJwks());
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk && !options.jwks) {
    jwk = (await getJwks(true)).find(
      (key) => key.kid === header.kid && key.kty === "RSA",
    );
  }
  if (!jwk) throw new GoogleAuthError();

  let valid = false;
  try {
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    valid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${headerB64}.${payloadB64}`),
      publicKey,
      Buffer.from(signatureB64, "base64url"),
    );
  } catch {
    throw new GoogleAuthError();
  }
  if (!valid) throw new GoogleAuthError();

  const payload = decodeSegment(payloadB64) as JwtPayload | null;
  if (!payload) throw new GoogleAuthError();

  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    throw new GoogleAuthError();
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSeconds + 300) {
    throw new GoogleAuthError();
  }
  if (!payload.iss || !ISSUERS.has(payload.iss)) throw new GoogleAuthError();
  if (payload.aud !== options.clientId) throw new GoogleAuthError();
  if (payload.nonce !== options.nonce) throw new GoogleAuthError();
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new GoogleAuthError();
  }

  const email =
    typeof payload.email === "string" && payload.email.length <= 320
      ? payload.email
      : null;
  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true";
  const name =
    typeof payload.name === "string" && payload.name.trim().length > 0
      ? sanitizePlainText(payload.name).slice(0, 80)
      : null;

  return { subject: payload.sub, email, emailVerified, name };
}
