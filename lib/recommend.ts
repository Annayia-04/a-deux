import { IDEAS } from "@/lib/ideas";
import { hashSeed, mulberry32 } from "@/lib/seeded";
import type { Idea, Prefs } from "@/lib/types";

/**
 * Un critère est « dur » (budget, lieu, moment, énergie, thèmes) : il filtre.
 * Le classement, lui, privilégie les idées qui cumulent les correspondances.
 */
export function matchesPrefs(idea: Idea, prefs: Prefs): boolean {
  if (prefs.budget !== null && idea.budget > prefs.budget) return false;

  if (
    prefs.setting !== "any" &&
    idea.setting !== "both" &&
    idea.setting !== prefs.setting
  ) {
    return false;
  }

  if (prefs.time !== "any" && idea.time !== "any" && idea.time !== prefs.time) {
    return false;
  }

  if (prefs.energy !== "any" && idea.energy !== prefs.energy) {
    return false;
  }

  if (
    prefs.themes.length > 0 &&
    !prefs.themes.some((theme) => idea.themes.includes(theme))
  ) {
    return false;
  }

  return true;
}

export function scoreIdea(idea: Idea, prefs: Prefs): number {
  let score = 0;
  for (const theme of idea.themes) {
    if (prefs.themes.includes(theme)) score += 3;
  }
  if (prefs.setting !== "any" && idea.setting === prefs.setting) score += 2;
  if (prefs.time !== "any" && idea.time === prefs.time) score += 1;
  if (prefs.energy !== "any" && idea.energy === prefs.energy) score += 1;
  // Petit bonus pour les idées gratuites quand le budget est serré.
  if (prefs.budget === 0 && idea.budget === 0) score += 1;
  return score;
}

export function filterIdeas(prefs: Prefs, ideas: readonly Idea[] = IDEAS): Idea[] {
  return ideas.filter((idea) => matchesPrefs(idea, prefs));
}

/** PRNG déterministe : le deck reste stable entre deux chargements d'une session. */

/**
 * Filtre puis classe. Le tri est stable pour un même seed (ordre de session),
 * ce qui évite qu'une carte change de position après un rechargement.
 */
export function rankIdeas(
  prefs: Prefs,
  seed: string,
  ideas: readonly Idea[] = IDEAS,
): Idea[] {
  const random = mulberry32(hashSeed(seed));
  return filterIdeas(prefs, ideas)
    .map((idea) => ({
      idea,
      score: scoreIdea(idea, prefs),
      tieBreaker: random(),
    }))
    .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker)
    .map((entry) => entry.idea);
}

export function countMatches(prefs: Prefs): number {
  return filterIdeas(prefs).length;
}
