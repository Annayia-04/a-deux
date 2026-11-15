import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_META } from "@/lib/preferences";

describe("illustrations de cartes", () => {
  it("fournit une gravure locale pour chaque univers", () => {
    for (const [theme, meta] of Object.entries(THEME_META)) {
      expect(meta.illustration).toMatch(/^\/illustrations\/[a-z-]+\.webp$/);

      const file = path.join(process.cwd(), "public", meta.illustration);
      expect(existsSync(file), `${theme} : ${file}`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(20_000);
    }
  });

  it("livre de vrais fichiers WebP, sans asset distant", () => {
    for (const meta of Object.values(THEME_META)) {
      const buffer = readFileSync(
        path.join(process.cwd(), "public", meta.illustration),
      );
      expect(buffer.subarray(0, 4).toString("latin1")).toBe("RIFF");
      expect(buffer.subarray(8, 12).toString("latin1")).toBe("WEBP");
    }
  });
});
