import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

export function fail(status: number, error: string): NextResponse {
  return json({ error }, status);
}

/**
 * Lecture du corps JSON : limite de taille, en-tête de type vérifié,
 * puis validation stricte par Zod. On ne fait jamais confiance au client.
 */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Type de contenu non supporté.");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "Requête trop volumineuse.");
  }

  const raw = await request.text();
  if (raw.length === 0) throw new HttpError(400, "Corps de requête vide.");
  if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, "Requête trop volumineuse.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "JSON invalide.");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new HttpError(400, "Données invalides.");
  }
  return result.data;
}

/**
 * Protection CSRF : les mutations doivent venir de la même origine.
 * Le cookie est HttpOnly + SameSite=Lax, cette vérification ajoute une barrière.
 */
export function assertSameOrigin(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new HttpError(403, "Origine non autorisée.");
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    // Les navigateurs envoient toujours Origin sur une requête mutative.
    // En développement on tolère les clients sans Origin (curl, tests).
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(403, "Origine non autorisée.");
    }
    return;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Origine non autorisée.");
  }

  if (originHost !== host) {
    throw new HttpError(403, "Origine non autorisée.");
  }
}

/** Best effort : `x-forwarded-for` doit être fourni par un proxy de confiance. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const candidate = first || request.headers.get("x-real-ip") || "unknown";
  return candidate.slice(0, 64);
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  identity?: string,
): void {
  const key = `${scope}:${identity ?? clientIp(request)}`;
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new HttpError(
      429,
      "Trop de requêtes. Patientez quelques secondes avant de réessayer.",
      result.retryAfterSeconds,
    );
  }
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    const response = fail(error.status, error.message);
    if (error.retryAfterSeconds) {
      response.headers.set("retry-after", String(error.retryAfterSeconds));
    }
    return response;
  }

  // Aucun détail interne (stack, SQL, chemins) ne doit fuiter au client.
  console.error("[api] erreur inattendue :", error);
  return fail(500, "Une erreur inattendue est survenue.");
}
