/**
 * Limiteur en mémoire, suffisant pour un déploiement mono-processus.
 * En production multi-instances, remplacer par Redis (même interface).
 */
type Bucket = number[];

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const hits = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (hits.length >= limit) {
    const oldest = hits[0] ?? now;
    const retryAfterMs = windowMs - (now - oldest);
    buckets.set(key, hits);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Nettoyage opportuniste pour éviter une croissance non bornée de la Map.
  if (buckets.size > MAX_KEYS) {
    for (const [bucketKey, values] of buckets) {
      const lastHit = values[values.length - 1] ?? 0;
      if (values.length === 0 || now - lastHit > windowMs) {
        buckets.delete(bucketKey);
      }
    }
  }

  return {
    ok: true,
    remaining: limit - hits.length,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimits(): void {
  buckets.clear();
}
