import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Le cookie contient un jeton opaque de 256 bits. Seul son SHA-256 est stocké
 * en base : une fuite de la base ne permet donc pas de rejouer les sessions.
 */
export const SESSION_COOKIE = "date_swipe_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function isValidSessionToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Comparaison à temps constant, utile pour les vérifications de hash. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
