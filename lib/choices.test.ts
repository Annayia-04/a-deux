import { describe, expect, it } from "vitest";
import {
  CHOICES,
  CHOICES_BY_CATEGORY,
  CHOICES_BY_ID,
  CHOICE_CATEGORY_META,
  rankChoices,
} from "@/lib/choices";
import { choiceSchema } from "@/lib/schemas";
import { CHOICE_CATEGORIES } from "@/lib/types";

describe("catalogue de choix", () => {
  it("propose au moins 20 cartes par catégorie", () => {
    for (const category of CHOICE_CATEGORIES) {
      expect(
        CHOICES_BY_CATEGORY[category].length,
        `catégorie trop pauvre : ${category}`,
      ).toBeGreaterThanOrEqual(20);
    }
  });

  it("respecte le schéma strict", () => {
    for (const choice of CHOICES) {
      const result = choiceSchema.safeParse(choice);
      expect(result.success, `carte invalide : ${choice.id}`).toBe(true);
    }
  });

  it("enrichit chaque carte avec ses métadonnées", () => {
    for (const choice of CHOICES) {
      if (choice.category === "food") {
        expect(choice.mode, choice.id).toBeTruthy();
        expect(choice.budget, choice.id).toBeGreaterThanOrEqual(1);
        expect(choice.time, choice.id).toBeGreaterThan(0);
      } else {
        expect(choice.duration, choice.id).toBeGreaterThan(0);
        expect(choice.rating, choice.id).toBeGreaterThan(0);
      }
    }
  });

  it("ouvre le catalogue Film aux séries IMDb", () => {
    const movies = CHOICES_BY_CATEGORY.movie;
    expect(movies.length).toBeGreaterThanOrEqual(400);
    expect(movies.some((choice) => choice.kind === "series")).toBe(true);
    expect(movies.some((choice) => choice.id.startsWith("tt"))).toBe(true);
  });

  it("utilise des identifiants et des titres uniques", () => {
    const ids = new Set(CHOICES.map((choice) => choice.id));
    const titles = new Set(CHOICES.map((choice) => choice.title));
    expect(ids.size).toBe(CHOICES.length);
    expect(titles.size).toBe(CHOICES.length);
    expect(CHOICES_BY_ID.size).toBe(CHOICES.length);
  });

  it("range chaque carte dans la bonne catégorie", () => {
    for (const choice of CHOICES) {
      expect(CHOICES_BY_CATEGORY[choice.category]).toContainEqual(choice);
    }
    for (const category of CHOICE_CATEGORIES) {
      expect(CHOICE_CATEGORY_META[category].label.length).toBeGreaterThan(0);
    }
  });

  it("garde un ordre déterministe pour une même session", () => {
    const first = rankChoices("food", "session-a").map((choice) => choice.id);
    const second = rankChoices("food", "session-a").map((choice) => choice.id);
    expect(second).toEqual(first);
  });

  it("mélange réellement le deck selon la session", () => {
    const first = rankChoices("movie", "session-a").map((choice) => choice.id);
    const second = rankChoices("movie", "session-b").map((choice) => choice.id);
    expect(second).not.toEqual(first);
  });

  it("conserve toutes les cartes et ne modifie pas le catalogue", () => {
    const before = CHOICES.map((choice) => choice.id);
    const deck = rankChoices("food", "session-c");
    const foodIds = CHOICES_BY_CATEGORY.food.map((choice) => choice.id);
    expect(new Set(deck.map((choice) => choice.id))).toEqual(new Set(foodIds));
    expect(CHOICES.map((choice) => choice.id)).toEqual(before);
  });
});
