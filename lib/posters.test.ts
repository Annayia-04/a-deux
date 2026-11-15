import { describe, expect, it } from "vitest";
import { MOVIE_POSTERS } from "@/lib/posters";

describe("affiches de films", () => {
  it("fournit un manifeste local d'au moins 150 affiches", () => {
    const entries = Object.entries(MOVIE_POSTERS);
    expect(entries.length).toBeGreaterThanOrEqual(150);
    for (const [id, url] of entries) {
      expect(id.length, id).toBeGreaterThan(2);
      expect(url, id).toMatch(
        /^https:\/\/upload\.wikimedia\.org\/wikipedia\/[a-z-]+\//,
      );
      expect(url, id).not.toContain("?");
    }
  });
});
