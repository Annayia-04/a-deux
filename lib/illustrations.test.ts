import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_META } from "@/lib/preferences";

describe("illustrations de cartes", () => {
  it("fournit une gravure locale pour chaque univers", () => {
    for (const [theme, meta] of Object.entries(THEME_META)) {
      expect(meta.illustration).toMatch(/^\/illustrations\/[a-z-]+\.svg$/);

      const file = path.join(process.cwd(), "public", meta.illustration);
      expect(existsSync(file), `${theme} : ${file}`).toBe(true);
      expect(readFileSync(file, "utf8").length).toBeGreaterThan(800);
    }
  });

  it("ne référence aucun asset externe", () => {
    for (const meta of Object.values(THEME_META)) {
      const svg = readFileSync(
        path.join(process.cwd(), "public", meta.illustration),
        "utf8",
      );
      // Le namespace XML est autorisé ; aucun href ni url() distant.
      expect(svg).not.toMatch(/(?:href|url\()\s*[=:(]?\s*["']?https?:/i);
    }
  });
});
