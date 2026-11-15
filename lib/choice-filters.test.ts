import { describe, expect, it } from "vitest";
import { CHOICES_BY_ID, formatChoiceDuration } from "@/lib/choices";
import {
  countChoiceFilters,
  filterChoices,
} from "@/lib/choice-filters";
import type { Choice } from "@/lib/types";

const food = (id: string) => CHOICES_BY_ID.get(id) as Choice;
const movie = (id: string) => CHOICES_BY_ID.get(id) as Choice;

describe("filtres Food et Film", () => {
  it("filtre les plats par mode, budget et envie", () => {
    const deck = [
      food("pizza-maison"),
      food("sushis"),
      food("crepes"),
    ];
    expect(
      filterChoices(deck, { mode: "cuisiner" }).map((item) => item.id),
    ).toEqual(["pizza-maison", "crepes"]);
    expect(
      filterChoices(deck, { budget: 3 }).map((item) => item.id),
    ).toEqual(["sushis"]);
    expect(
      filterChoices(deck, { tag: "sucre" }).map((item) => item.id),
    ).toEqual(["crepes"]);
  });

  it("filtre les films par lieu, durée, genre et plateforme", () => {
    const deck = [
      movie("inception"),
      movie("totoro"),
      movie("portrait-femme-en-feu"),
    ];
    expect(
      filterChoices(deck, { place: "cinema" }).map((item) => item.id),
    ).toEqual(["portrait-femme-en-feu"]);
    expect(
      filterChoices(deck, { duration: "short" }).map((item) => item.id),
    ).toEqual(["totoro"]);
    expect(
      filterChoices(deck, { duration: "long" }).map((item) => item.id),
    ).toEqual(["inception", "portrait-femme-en-feu"]);
    expect(
      filterChoices(deck, { platform: "netflix" }).map((item) => item.id),
    ).toEqual(["inception", "totoro"]);
  });

  it("compte les critères actifs", () => {
    expect(countChoiceFilters({})).toBe(0);
    expect(countChoiceFilters({ mode: "cuisiner", budget: 2 })).toBe(2);
  });

  it("formate les durées", () => {
    expect(formatChoiceDuration(25)).toBe("25 min");
    expect(formatChoiceDuration(115)).toBe("1 h 55");
    expect(formatChoiceDuration(120)).toBe("2 h");
  });
});
