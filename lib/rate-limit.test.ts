import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("autorise jusqu'à la limite puis bloque", () => {
    const now = 1_000_000;
    expect(rateLimit("test", 3, 60_000, now).ok).toBe(true);
    expect(rateLimit("test", 3, 60_000, now + 10).ok).toBe(true);
    expect(rateLimit("test", 3, 60_000, now + 20).ok).toBe(true);

    const blocked = rateLimit("test", 3, 60_000, now + 30);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libère la fenêtre après expiration", () => {
    const now = 2_000_000;
    rateLimit("fenetre", 1, 1_000, now);
    expect(rateLimit("fenetre", 1, 1_000, now + 500).ok).toBe(false);
    expect(rateLimit("fenetre", 1, 1_000, now + 1_001).ok).toBe(true);
  });

  it("isole les clés", () => {
    const now = 3_000_000;
    expect(rateLimit("a", 1, 1_000, now).ok).toBe(true);
    expect(rateLimit("b", 1, 1_000, now).ok).toBe(true);
  });
});
