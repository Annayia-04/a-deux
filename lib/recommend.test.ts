import { describe, expect, it } from "vitest";
import { IDEAS } from "@/lib/ideas";
import {
  countMatches,
  filterIdeas,
  matchesPrefs,
  rankIdeas,
  scoreIdea,
} from "@/lib/recommend";
import { DEFAULT_PREFS, type Idea, type Prefs } from "@/lib/types";

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "test-idea",
    title: "Idée de test",
    tagline: "Une tagline de test.",
    description: "Une description suffisamment longue pour valider le schéma.",
    themes: ["nature"],
    setting: "outdoor",
    time: "day",
    energy: "calm",
    budget: 10,
    duration: "1 h",
    emoji: "🧪",
    tip: "Une astuce de test.",
    ...overrides,
  };
}

describe("matchesPrefs", () => {
  it("filtre selon le budget maximum", () => {
    const idea = makeIdea({ budget: 45 });
    expect(matchesPrefs(idea, { ...DEFAULT_PREFS, budget: 30 })).toBe(false);
    expect(matchesPrefs(idea, { ...DEFAULT_PREFS, budget: 80 })).toBe(true);
    expect(matchesPrefs(idea, { ...DEFAULT_PREFS, budget: null })).toBe(true);
  });

  it("accepte les idées mixtes quel que soit le lieu choisi", () => {
    const idea = makeIdea({ setting: "both" });
    const indoor: Prefs = { ...DEFAULT_PREFS, setting: "indoor" };
    const outdoor: Prefs = { ...DEFAULT_PREFS, setting: "outdoor" };
    expect(matchesPrefs(idea, indoor)).toBe(true);
    expect(matchesPrefs(idea, outdoor)).toBe(true);
  });

  it("respecte le créneau horaire", () => {
    const evening = makeIdea({ time: "evening" });
    expect(matchesPrefs(evening, { ...DEFAULT_PREFS, time: "day" })).toBe(false);
    expect(matchesPrefs(evening, { ...DEFAULT_PREFS, time: "evening" })).toBe(
      true,
    );
  });

  it("filtre les thèmes en OU", () => {
    const idea = makeIdea({ themes: ["gastronomie"] });
    expect(
      matchesPrefs(idea, { ...DEFAULT_PREFS, themes: ["nature", "gastronomie"] }),
    ).toBe(true);
    expect(matchesPrefs(idea, { ...DEFAULT_PREFS, themes: ["nature"] })).toBe(
      false,
    );
  });

  it("n'impose aucun thème quand la liste est vide", () => {
    expect(matchesPrefs(makeIdea(), DEFAULT_PREFS)).toBe(true);
  });
});

describe("scoreIdea", () => {
  it("privilégie les correspondances de thèmes", () => {
    const idea = makeIdea({ themes: ["nature", "sport"] });
    const withThemes: Prefs = { ...DEFAULT_PREFS, themes: ["nature", "sport"] };
    const withoutThemes: Prefs = { ...DEFAULT_PREFS, themes: [] };
    expect(scoreIdea(idea, withThemes)).toBeGreaterThan(
      scoreIdea(idea, withoutThemes),
    );
  });
});

describe("rankIdeas", () => {
  it("produit un ordre stable pour un même seed", () => {
    const first = rankIdeas(DEFAULT_PREFS, "seed-stable").map((idea) => idea.id);
    const second = rankIdeas(DEFAULT_PREFS, "seed-stable").map((idea) => idea.id);
    expect(first).toEqual(second);
  });

  it("ne renvoie que des idées compatibles", () => {
    const prefs: Prefs = {
      budget: 80,
      setting: "indoor",
      time: "evening",
      energy: "calm",
      themes: ["gastronomie"],
    };
    const ranked = rankIdeas(prefs, "seed");
    expect(ranked.length).toBeGreaterThan(0);
    for (const idea of ranked) {
      expect(matchesPrefs(idea, prefs)).toBe(true);
      expect(idea.budget).toBeLessThanOrEqual(80);
      expect(idea.setting).not.toBe("outdoor");
      expect(idea.themes).toContain("gastronomie");
    }
  });

  it("conserve l'ensemble du catalogue quand aucun filtre n'est actif", () => {
    const openPrefs: Prefs = {
      budget: null,
      setting: "any",
      time: "any",
      energy: "any",
      themes: [],
    };
    expect(countMatches(openPrefs)).toBe(IDEAS.length);
    expect(filterIdeas(openPrefs)).toHaveLength(IDEAS.length);
  });
});
