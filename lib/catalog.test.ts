import { describe, expect, it } from "vitest";
import { IDEAS } from "@/lib/ideas";
import { matchesPrefs } from "@/lib/recommend";
import { ideaSchema } from "@/lib/schemas";
import {
  DEFAULT_PREFS,
  THEMES,
  type BudgetValue,
  type Energy,
  type Setting,
  type TimeOfDay,
} from "@/lib/types";

const BUDGETS: BudgetValue[] = [0, 30, 80, null];
const SETTINGS: Exclude<Setting, "both">[] = ["indoor", "outdoor"];
const TIMES: Exclude<TimeOfDay, "any">[] = ["day", "evening"];
const ENERGIES: Energy[] = ["calm", "active"];

describe("catalogue d'idées", () => {
  it("contient au moins 120 idées", () => {
    expect(IDEAS.length).toBeGreaterThanOrEqual(120);
  });

  it("respecte le schéma strict", () => {
    for (const idea of IDEAS) {
      const result = ideaSchema.safeParse(idea);
      expect(result.success, `idée invalide : ${idea.id}`).toBe(true);
    }
  });

  it("utilise des identifiants et des titres uniques", () => {
    const ids = new Set(IDEAS.map((idea) => idea.id));
    const titles = new Set(IDEAS.map((idea) => idea.title));
    expect(ids.size).toBe(IDEAS.length);
    expect(titles.size).toBe(IDEAS.length);
  });

  it("couvre tous les thèmes", () => {
    for (const theme of THEMES) {
      const count = IDEAS.filter((idea) => idea.themes.includes(theme)).length;
      expect(count, `thème sans idée : ${theme}`).toBeGreaterThan(0);
    }
  });

  it("propose des options gratuites, intérieures et extérieures", () => {
    expect(IDEAS.some((idea) => idea.budget === 0)).toBe(true);
    expect(IDEAS.some((idea) => idea.setting === "indoor")).toBe(true);
    expect(IDEAS.some((idea) => idea.setting === "outdoor")).toBe(true);
  });

  it("offre au moins trois idées pour chaque combinaison de filtres", () => {
    for (const budget of BUDGETS) {
      for (const setting of SETTINGS) {
        for (const time of TIMES) {
          for (const energy of ENERGIES) {
            const count = IDEAS.filter((idea) =>
              matchesPrefs(idea, {
                ...DEFAULT_PREFS,
                budget,
                setting,
                time,
                energy,
                themes: [],
              }),
            ).length;
            expect(
              count,
              `trop peu d'idées : budget ${budget}, ${setting}, ${time}, ${energy}`,
            ).toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });
});
