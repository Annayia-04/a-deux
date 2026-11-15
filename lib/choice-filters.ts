import type { Choice, FoodMode, MoviePlatform } from "@/lib/types";

export type ChoiceFilterState = {
  tag?: string;
  mode?: FoodMode;
  budget?: 1 | 2 | 3;
  place?: "canape" | "cinema";
  duration?: "short" | "long";
  platform?: MoviePlatform;
  kind?: "movie" | "series";
};

/** Applique les filtres Food ou Film au deck courant. */
export function filterChoices(
  deck: Choice[],
  filters: ChoiceFilterState,
): Choice[] {
  return deck.filter((choice) => {
    if (filters.tag && !choice.tags.includes(filters.tag)) return false;

    if (choice.category === "food") {
      if (filters.mode && choice.mode !== filters.mode) return false;
      if (filters.budget && choice.budget !== filters.budget) return false;
      return true;
    }

    if (filters.kind && (choice.kind ?? "movie") !== filters.kind) return false;
    const place = choice.platform === "salle" ? "cinema" : "canape";
    if (filters.place && place !== filters.place) return false;
    if (filters.platform && choice.platform !== filters.platform) return false;
    if (filters.duration === "short" && (choice.duration ?? 0) >= 105) {
      return false;
    }
    if (filters.duration === "long" && (choice.duration ?? 0) <= 120) {
      return false;
    }
    return true;
  });
}

export function countChoiceFilters(filters: ChoiceFilterState): number {
  return Object.values(filters).filter(Boolean).length;
}
