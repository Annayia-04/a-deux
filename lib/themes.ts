export const THEME_COOKIE = "a_deux_theme";

export type ThemeId =
  | "gothique"
  | "minuit"
  | "rose"
  | "foret"
  | "tarot"
  | "ocean"
  | "lavande"
  | "terracotta";

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  description: string;
  /** Couleur de la barre du navigateur / de la PWA. */
  themeColor: string;
  swatches: readonly [string, string, string];
};

export const THEMES: readonly ThemeMeta[] = [
  {
    id: "gothique",
    label: "Gothique romantique",
    description: "Noir velouté, bordeaux et or vieilli.",
    themeColor: "#0a090c",
    swatches: ["#0a090c", "#9e192d", "#c5a059"],
  },
  {
    id: "minuit",
    label: "Minuit",
    description: "Bleu nuit, prune et argent terni.",
    themeColor: "#060a12",
    swatches: ["#060a12", "#7b3557", "#b9c4d4"],
  },
  {
    id: "rose",
    label: "Rose fanée",
    description: "Prune, rose poudré et or rose.",
    themeColor: "#120a0e",
    swatches: ["#120a0e", "#a03a52", "#d8b48e"],
  },
  {
    id: "foret",
    label: "Forêt ancienne",
    description: "Vert profond, bordeaux et laiton patiné.",
    themeColor: "#070d09",
    swatches: ["#070d09", "#8e2f3c", "#c8b27a"],
  },
  {
    id: "tarot",
    label: "Tarot ancien",
    description: "Parchemin fumé, cuivre et encre brune.",
    themeColor: "#0b0906",
    swatches: ["#0b0906", "#8f2f3a", "#d9b46b"],
  },
  {
    id: "ocean",
    label: "Océan de minuit",
    description: "Bleu abyssal, écume et laiton mouillé.",
    themeColor: "#050c11",
    swatches: ["#050c11", "#2f6d74", "#c7b98a"],
  },
  {
    id: "lavande",
    label: "Nuit de lavande",
    description: "Violet profond, lilas et or pâle.",
    themeColor: "#0c0712",
    swatches: ["#0c0712", "#7a3f86", "#cdb47f"],
  },
  {
    id: "terracotta",
    label: "Terre cuite",
    description: "Argile brûlée, cuivre et sable chaud.",
    themeColor: "#120b08",
    swatches: ["#120b08", "#a14834", "#cf9d5f"],
  },
] as const;

export const DEFAULT_THEME: ThemeId = "gothique";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function parseTheme(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function themeById(id: ThemeId): ThemeMeta {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}
