import type { Idea, Prefs, Theme } from "@/lib/types";

type Meta = {
  label: string;
  emoji: string;
  /** Dégradé du visuel de carte, du plus clair au plus profond. */
  gradient: readonly [string, string];
  accent: string;
};

export const THEME_META: Record<Theme, Meta> = {
  culture: {
    label: "Culture",
    emoji: "🖼️",
    gradient: ["#4b3560", "#221a2f"],
    accent: "#d8c7e6",
  },
  gastronomie: {
    label: "Gastronomie",
    emoji: "🍽️",
    gradient: ["#7d3a2c", "#2a1512"],
    accent: "#ecc9a9",
  },
  nature: {
    label: "Nature",
    emoji: "🌿",
    gradient: ["#3f5a45", "#141d17"],
    accent: "#c6dcc6",
  },
  aventure: {
    label: "Aventure",
    emoji: "🧭",
    gradient: ["#6f2f22", "#23100f"],
    accent: "#e8c2a6",
  },
  creatif: {
    label: "Créatif",
    emoji: "🎨",
    gradient: ["#5f2a42", "#231120"],
    accent: "#e6c1d1",
  },
  detente: {
    label: "Détente",
    emoji: "🛋️",
    gradient: ["#3b4a60", "#161b25"],
    accent: "#c7d4e4",
  },
  sport: {
    label: "Sport",
    emoji: "🏃",
    gradient: ["#4f4f2c", "#1b1b11"],
    accent: "#dedcb4",
  },
  nocturne: {
    label: "Nocturne",
    emoji: "🌙",
    gradient: ["#54243c", "#1b0f1e"],
    accent: "#e2c2d2",
  },
};

export const THEME_OPTIONS = (Object.keys(THEME_META) as Theme[]).map((value) => ({
  value,
  ...THEME_META[value],
}));

export const BUDGET_OPTIONS: {
  value: Prefs["budget"];
  label: string;
  hint: string;
}[] = [
  { value: 0, label: "Gratuit", hint: "0 €" },
  { value: 30, label: "Petit budget", hint: "≤ 30 €" },
  { value: 80, label: "Confort", hint: "≤ 80 €" },
  { value: null, label: "Sans limite", hint: "Toutes les idées" },
];

export const SETTING_OPTIONS: {
  value: Prefs["setting"];
  label: string;
  shortLabel: string;
  emoji: string;
}[] = [
  { value: "any", label: "Peu importe", shortLabel: "Tous", emoji: "✨" },
  { value: "indoor", label: "En intérieur", shortLabel: "Intérieur", emoji: "🏠" },
  { value: "outdoor", label: "En extérieur", shortLabel: "Extérieur", emoji: "🌤️" },
];

export const TIME_OPTIONS: {
  value: Prefs["time"];
  label: string;
  shortLabel: string;
  emoji: string;
}[] = [
  { value: "any", label: "Peu importe", shortLabel: "Tous", emoji: "✨" },
  { value: "day", label: "En journée", shortLabel: "Journée", emoji: "☀️" },
  { value: "evening", label: "En soirée", shortLabel: "Soirée", emoji: "🌆" },
];

export const ENERGY_OPTIONS: {
  value: Prefs["energy"];
  label: string;
  shortLabel: string;
  emoji: string;
}[] = [
  { value: "any", label: "Peu importe", shortLabel: "Tous", emoji: "✨" },
  { value: "calm", label: "Tranquille", shortLabel: "Tranquille", emoji: "🍃" },
  { value: "active", label: "Active", shortLabel: "Active", emoji: "⚡" },
];

export const SETTING_LABEL: Record<Idea["setting"], string> = {
  indoor: "Intérieur",
  outdoor: "Extérieur",
  both: "Intérieur ou extérieur",
};

export const TIME_LABEL: Record<Idea["time"], string> = {
  day: "Journée",
  evening: "Soirée",
  any: "Jour ou soir",
};

export const ENERGY_LABEL: Record<Idea["energy"], string> = {
  calm: "Tranquille",
  active: "Active",
};

export function formatBudget(budget: number): string {
  return budget === 0 ? "Gratuit" : `≈ ${budget} € / pers.`;
}

export function formatPrefsBudget(budget: Prefs["budget"]): string {
  if (budget === null) return "Sans limite";
  if (budget === 0) return "Gratuit";
  return `≤ ${budget} €`;
}

/** Résumé lisible des préférences, utilisé dans l'en-tête du swipe. */
export function summarizePrefs(prefs: Prefs): string {
  const parts: string[] = [formatPrefsBudget(prefs.budget)];
  if (prefs.setting === "indoor") parts.push("intérieur");
  if (prefs.setting === "outdoor") parts.push("extérieur");
  if (prefs.time === "day") parts.push("journée");
  if (prefs.time === "evening") parts.push("soirée");
  if (prefs.energy === "calm") parts.push("tranquille");
  if (prefs.energy === "active") parts.push("actif");
  if (prefs.themes.length > 0) {
    parts.push(prefs.themes.map((theme) => THEME_META[theme].label.toLowerCase()).join(" · "));
  }
  return parts.join("  ·  ");
}

/** Nombre de critères réellement restreints (pastille « Filtres (N) »). */
export function countActivePrefs(prefs: Prefs): number {
  let count = 0;
  if (prefs.budget !== 80) count += 1;
  if (prefs.setting !== "any") count += 1;
  if (prefs.time !== "any") count += 1;
  if (prefs.energy !== "any") count += 1;
  count += prefs.themes.length;
  return count;
}
