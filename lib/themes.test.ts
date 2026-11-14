import { describe, expect, it } from "vitest";
import { isThemeId, parseTheme, THEMES, themeById } from "@/lib/themes";

describe("thèmes", () => {
  it("expose quatre thèmes avec des identifiants uniques", () => {
    expect(THEMES).toHaveLength(4);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(4);
  });

  it("valide uniquement les identifiants connus", () => {
    expect(isThemeId("minuit")).toBe(true);
    expect(isThemeId("foret")).toBe(true);
    expect(isThemeId("clair")).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });

  it("retombe sur le thème gothique pour une valeur absente ou forgée", () => {
    expect(parseTheme(undefined)).toBe("gothique");
    expect(parseTheme("inconnu")).toBe("gothique");
    expect(parseTheme("rose")).toBe("rose");
  });

  it("retrouve les métadonnées d’un thème", () => {
    expect(themeById("foret").label).toBe("Forêt ancienne");
    expect(themeById("minuit").themeColor).toMatch(/^#[0-9a-f]{6}$/);
  });
});
