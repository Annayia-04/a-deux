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
    gradient: ["#8a6bff", "#35206e"],
    accent: "#cec2ff",
  },
  gastronomie: {
    label: "Gastronomie",
    emoji: "🍽️",
    gradient: ["#ff9a62", "#7d2b4b"],
    accent: "#ffd3b3",
  },
  nature: {
    label: "Nature",
    emoji: "🌿",
    gradient: ["#54d6a6", "#0e5044"],
    accent: "#baf6de",
  },
  aventure: {
    label: "Aventure",
    emoji: "🧭",
    gradient: ["#ff8154", "#6f1c2c"],
    accent: "#ffc7ac",
  },
  creatif: {
    label: "Créatif",
    emoji: "🎨",
    gradient: ["#ff6fb8", "#561b74"],
    accent: "#ffc6e4",
  },
  detente: {
    label: "Détente",
    emoji: "🛋️",
    gradient: ["#6fcaff", "#1d3c78"],
    accent: "#c3e9ff",
  },
  sport: {
    label: "Sport",
    emoji: "🏃",
    gradient: ["#bde85f", "#215c39"],
    accent: "#e8ffb8",
  },
  nocturne: {
    label: "Nocturne",
    emoji: "🌙",
    gradient: ["#ff6f9c", "#2a1450"],
    accent: "#ffd0e0",
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
