/** Types partagés entre le serveur et le client. Aucun code serveur ici. */

export const THEMES = [
  "culture",
  "gastronomie",
  "nature",
  "aventure",
  "creatif",
  "detente",
  "sport",
  "nocturne",
] as const;

export type Theme = (typeof THEMES)[number];

export const SETTINGS = ["indoor", "outdoor", "both"] as const;
export type Setting = (typeof SETTINGS)[number];

export const TIMES = ["day", "evening", "any"] as const;
export type TimeOfDay = (typeof TIMES)[number];

export const ENERGIES = ["calm", "active"] as const;
export type Energy = (typeof ENERGIES)[number];

export type SwipeDirection = "like" | "pass";

/** Budget maximum par personne. `null` = sans limite, 0 = gratuit. */
export type BudgetValue = 0 | 30 | 80 | null;

export type Prefs = {
  budget: BudgetValue;
  setting: Exclude<Setting, "both"> | "any";
  time: TimeOfDay;
  energy: Energy | "any";
  themes: Theme[];
};

export type Idea = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  themes: Theme[];
  setting: Setting;
  time: TimeOfDay;
  energy: Energy;
  /** Budget estimé par personne, en euros. */
  budget: number;
  /** Durée lisible, ex. « 2 h 30 ». */
  duration: string;
  emoji: string;
  /** Le petit plus qui fait la différence. */
  tip: string;
};

export type Swipe = {
  ideaId: string;
  direction: SwipeDirection;
  createdAt: number;
};

export const CHOICE_CATEGORIES = ["food", "movie"] as const;
export type ChoiceCategory = (typeof CHOICE_CATEGORIES)[number];

/** Carte statique du catalogue Nourriture / Films. */
export type Choice = {
  id: string;
  category: ChoiceCategory;
  title: string;
  tagline: string;
  emoji: string;
  tags: string[];
};

export type ChoiceMatchSummary = {
  category: ChoiceCategory;
  choiceId: string;
  matchedAt: number;
  /** Vrai si ce membre a déjà vu ce match. */
  seen: boolean;
};

export type ChoiceMatchSnapshot = ChoiceMatchSummary & {
  choice: Choice;
};

export type ChoiceSnapshot = {
  category: ChoiceCategory;
  /** Cartes que cette session n'a pas encore swipées. */
  deck: Choice[];
  /** Matchs mutuels de la catégorie, du plus récent au plus ancien. */
  matches: ChoiceMatchSnapshot[];
  /** Cartes likées par cette session, de la plus récente à la plus ancienne. */
  liked: Choice[];
  swiped: number;
  total: number;
  unread: number;
};

export type SouvenirSnapshot = {
  id: string;
  title: string;
  emoji: string;
  ideaId: string | null;
  happenedAt: number;
  createdAt: number;
  /** Le moment écrit par la session courante, s'il existe. */
  mine: string | null;
  /** Le moment écrit par l'autre membre, s'il existe. */
  partner: string | null;
  /** Vrai quand les deux membres ont raconté leur moment. */
  complete: boolean;
};

export type TapSnapshot = {
  id: number;
  createdAt: number;
};

export type MatchSnapshot = {
  idea: Idea;
  matchedAt: number;
  /** Vrai si ce membre a déjà vu ce match dans son espace à deux. */
  seen: boolean;
};

export type CoupleSnapshot = {
  /** Code d'invitation à partager avec l'autre membre. */
  code: string;
  memberCount: number;
  /** Vrai quand les deux membres ont rejoint l'espace. */
  complete: boolean;
  /** Matchs mutuels, du plus récent au plus ancien. */
  matches: MatchSnapshot[];
  /** Nombre de matchs non encore consultés par ce membre. */
  unread: number;
  /** Matchs Nourriture / Films mutuels, toutes catégories confondues. */
  choiceMatches: ChoiceMatchSummary[];
  /** Nombre de matchs de choix non encore consultés par ce membre. */
  choiceUnread: number;
};

export type SessionSnapshot = {
  prefs: Prefs;
  /** Idées restant à swiper, déjà classées. */
  ideas: Idea[];
  /** Idées likées, de la plus récente à la plus ancienne. */
  likedIdeas: Idea[];
  /** Nombre d'idées compatibles avec les préférences. */
  total: number;
  /** Nombre de cartes déjà swipées. */
  swiped: number;
  /** Espace à deux auquel appartient la session, s'il existe. */
  couple: CoupleSnapshot | null;
};

export const DEFAULT_PREFS: Prefs = {
  budget: 80,
  setting: "any",
  time: "any",
  energy: "any",
  themes: [],
};

/** Identité affichée quand un compte est connecté (jamais de jeton côté client). */
export type AccountSnapshot = {
  displayName: string | null;
  email: string | null;
};

export const MAX_THEMES = 3;
