import { hashSeed, mulberry32 } from "@/lib/seeded";
import { IMDB_CHOICES } from "@/lib/imdb-choices";
import type { Choice, ChoiceCategory, FoodMode, MoviePlatform } from "@/lib/types";

/**
 * Catalogues statiques Nourriture / Films.
 * Aucun asset distant : les visuels sont des emojis et des dégradés CSS.
 */
const CURATED_CHOICES: Choice[] = [
  // -------------------------------------------------------------------------
  // Nourriture
  // -------------------------------------------------------------------------
  {
    id: "pizza-maison",
    category: "food",
    title: "Pizza maison",
    tagline: "Pâte étalée, four brûlant, discussions sur la garniture.",
    emoji: "🍕",
    tags: ["italien", "four"],
    mode: "cuisiner", budget: 1, time: 25,
  },
  {
    id: "pates-fraiches",
    category: "food",
    title: "Pâtes fraîches",
    tagline: "Une sauce simple, beaucoup de parmesan.",
    emoji: "🍝",
    tags: ["italien", "rapide"],
    mode: "cuisiner", budget: 1, time: 20,
  },
  {
    id: "ramen",
    category: "food",
    title: "Ramen",
    tagline: "Un bouillon long, des œufs mollets, du bruit en mangeant.",
    emoji: "🍜",
    tags: ["asiatique", "chaud"],
    mode: "restaurant", budget: 2, time: 45,
  },
  {
    id: "sushis",
    category: "food",
    title: "Sushis",
    tagline: "Commande à partager, baguettes mal tenues.",
    emoji: "🍣",
    tags: ["japonais", "frais"],
    mode: "livraison", budget: 3, time: 30,
  },
  {
    id: "tacos",
    category: "food",
    title: "Tacos",
    tagline: "Ça déborde, c'est le but.",
    emoji: "🌮",
    tags: ["mexicain", "epice"],
    mode: "livraison", budget: 1, time: 20,
  },
  {
    id: "burgers",
    category: "food",
    title: "Burgers",
    tagline: "Pain brioché, frites, serviettes en quantité.",
    emoji: "🍔",
    tags: ["americain", "gourmand"],
    mode: "livraison", budget: 2, time: 25,
  },
  {
    id: "buddha-bowl",
    category: "food",
    title: "Buddha bowl",
    tagline: "Des légumes, des graines, une sauce qui change tout.",
    emoji: "🥗",
    tags: ["sain", "vegetarien"],
    mode: "cuisiner", budget: 2, time: 30,
  },
  {
    id: "poke-bowl",
    category: "food",
    title: "Poke bowl",
    tagline: "Riz tiède, poisson frais, avocat en lamelles.",
    emoji: "🐟",
    tags: ["frais", "sain"],
    mode: "livraison", budget: 2, time: 20,
  },
  {
    id: "couscous",
    category: "food",
    title: "Couscous",
    tagline: "Un grand plat, deux assiettes, personne ne compte.",
    emoji: "🍲",
    tags: ["oriental", "convivial"],
    mode: "cuisiner", budget: 1, time: 60,
  },
  {
    id: "raclette",
    category: "food",
    title: "Raclette",
    tagline: "Le fromage coule, la soirée aussi.",
    emoji: "🧀",
    tags: ["fromage", "hiver"],
    mode: "cuisiner", budget: 2, time: 40,
  },
  {
    id: "fondue-savoyarde",
    category: "food",
    title: "Fondue savoyarde",
    tagline: "Du pain, du vin blanc, une fourchette à partager.",
    emoji: "🫕",
    tags: ["fromage", "hiver"],
    mode: "cuisiner", budget: 2, time: 40,
  },
  {
    id: "crepes",
    category: "food",
    title: "Crêpes",
    tagline: "Sucrées, salées, et une dernière pour la route.",
    emoji: "🥞",
    tags: ["sucre", "breton"],
    mode: "cuisiner", budget: 1, time: 30,
  },
  {
    id: "brunch",
    category: "food",
    title: "Brunch",
    tagline: "Trop de plats, aucun horaire, café à volonté.",
    emoji: "🍳",
    tags: ["weekend", "long"],
    mode: "restaurant", budget: 2, time: 60,
  },
  {
    id: "tapas",
    category: "food",
    title: "Tapas",
    tagline: "Pleins de petites assiettes et de grandes discussions.",
    emoji: "🫒",
    tags: ["espagnol", "partage"],
    mode: "restaurant", budget: 2, time: 60,
  },
  {
    id: "dim-sum",
    category: "food",
    title: "Dim sum",
    tagline: "Des paniers vapeur qui n'arrêtent jamais d'arriver.",
    emoji: "🥟",
    tags: ["chinois", "partage"],
    mode: "restaurant", budget: 2, time: 60,
  },
  {
    id: "curry",
    category: "food",
    title: "Curry",
    tagline: "Épicé juste ce qu'il faut, avec beaucoup de riz.",
    emoji: "🍛",
    tags: ["indien", "epice"],
    mode: "cuisiner", budget: 2, time: 45,
  },
  {
    id: "barbecue",
    category: "food",
    title: "Barbecue",
    tagline: "Légumes grillés, brochettes, fumée dans les cheveux.",
    emoji: "🍖",
    tags: ["ete", "dehors"],
    mode: "cuisiner", budget: 2, time: 60,
  },
  {
    id: "pique-nique",
    category: "food",
    title: "Pique-nique",
    tagline: "Une couverture, des sandwiches, le soleil décide.",
    emoji: "🧺",
    tags: ["dehors", "simple"],
    mode: "cuisiner", budget: 1, time: 30,
  },
  {
    id: "soupe-maison",
    category: "food",
    title: "Soupe maison",
    tagline: "Un légume, un mixeur, deux bols fumants.",
    emoji: "🥣",
    tags: ["hiver", "reconfort"],
    mode: "cuisiner", budget: 1, time: 30,
  },
  {
    id: "risotto",
    category: "food",
    title: "Risotto",
    tagline: "On remue à tour de rôle, on goûte trop souvent.",
    emoji: "🍚",
    tags: ["italien", "cremeux"],
    mode: "cuisiner", budget: 2, time: 40,
  },
  {
    id: "paella",
    category: "food",
    title: "Paella",
    tagline: "Un plat pour deux, posé au milieu de la table.",
    emoji: "🥘",
    tags: ["espagnol", "convivial"],
    mode: "cuisiner", budget: 2, time: 60,
  },
  {
    id: "assiette-grecque",
    category: "food",
    title: "Assiette grecque",
    tagline: "Feta, tomates, olives et pain chaud.",
    emoji: "🥙",
    tags: ["grec", "frais"],
    mode: "livraison", budget: 1, time: 25,
  },
  {
    id: "pho",
    category: "food",
    title: "Pho",
    tagline: "Un bouillon parfumé, des herbes fraîches à ajouter.",
    emoji: "🥢",
    tags: ["vietnamien", "chaud"],
    mode: "restaurant", budget: 2, time: 40,
  },
  {
    id: "bagels",
    category: "food",
    title: "Bagels",
    tagline: "Pain dense, garniture généreuse, papier sulfurisé.",
    emoji: "🥯",
    tags: ["brunch", "rapide"],
    mode: "livraison", budget: 1, time: 20,
  },
  {
    id: "food-truck",
    category: "food",
    title: "Food truck",
    tagline: "On commande au comptoir et on mange sur un capot.",
    emoji: "🚚",
    tags: ["rue", "rapide"],
    mode: "restaurant", budget: 1, time: 20,
  },
  {
    id: "apero-marche",
    category: "food",
    title: "Apéro au marché",
    tagline: "Fromage, tomates, pain : le marché fait le reste.",
    emoji: "🧺",
    tags: ["dehors", "local"],
    mode: "restaurant", budget: 1, time: 45,
  },
  {
    id: "chocolat-chaud",
    category: "food",
    title: "Chocolat chaud",
    tagline: "Deux tasses, des viennoiseries, personne ne bouge.",
    emoji: "☕",
    tags: ["sucre", "cosy"],
    mode: "cuisiner", budget: 1, time: 10,
  },
  {
    id: "glaces",
    category: "food",
    title: "Glaces",
    tagline: "Deux parfums, une cuillère volée.",
    emoji: "🍦",
    tags: ["ete", "sucre"],
    mode: "restaurant", budget: 2, time: 20,
  },
  {
    id: "planche-apero",
    category: "food",
    title: "Planche apéro",
    tagline: "Charcuterie, fromage, pickles et lumière tamisée.",
    emoji: "🍷",
    tags: ["partage", "soir"],
    mode: "cuisiner", budget: 2, time: 20,
  },
  {
    id: "bibimbap",
    category: "food",
    title: "Bibimbap",
    tagline: "Tout mélanger avant de goûter, c'est la règle.",
    emoji: "🍱",
    tags: ["coreen", "complet"],
    mode: "restaurant", budget: 2, time: 40,
  },

  // -------------------------------------------------------------------------
  // Films
  // -------------------------------------------------------------------------
  {
    id: "inception",
    category: "movie",
    title: "Inception",
    tagline: "Des rêves imbriqués et une fin qui cloche.",
    emoji: "🌀",
    tags: ["science-fiction", "thriller"],
    duration: 148, rating: 8.8, platform: "netflix",
  },
  {
    id: "interstellar",
    category: "movie",
    title: "Interstellar",
    tagline: "L'espace, le temps, les larmes.",
    emoji: "🚀",
    tags: ["science-fiction", "drame"],
    duration: 169, rating: 8.7, platform: "prime",
  },
  {
    id: "le-grand-bain",
    category: "movie",
    title: "Le Grand Bain",
    tagline: "Une équipe de bras cassés et une piscine.",
    emoji: "🏊",
    tags: ["comedie", "francais"],
    duration: 122, rating: 6.9, platform: "netflix",
  },
  {
    id: "intouchables",
    category: "movie",
    title: "Intouchables",
    tagline: "Une amitié improbable, des répliques cultes.",
    emoji: "🤝",
    tags: ["comedie", "francais"],
    duration: 112, rating: 8.5, platform: "netflix",
  },
  {
    id: "amelie-poulain",
    category: "movie",
    title: "Le Fabuleux Destin d'Amélie Poulain",
    tagline: "Paris en mieux, avec des cuillères qui cassent.",
    emoji: "🍮",
    tags: ["romantique", "francais"],
    duration: 122, rating: 8.3, platform: "prime",
  },
  {
    id: "la-la-land",
    category: "movie",
    title: "La La Land",
    tagline: "Des pas de danse et un peu de mélancolie.",
    emoji: "🎹",
    tags: ["romantique", "musique"],
    duration: 128, rating: 8.0, platform: "netflix",
  },
  {
    id: "whiplash",
    category: "movie",
    title: "Whiplash",
    tagline: "La batterie jusqu'au bout de la nuit.",
    emoji: "🥁",
    tags: ["drame", "musique"],
    duration: 107, rating: 8.5, platform: "prime",
  },
  {
    id: "parasite",
    category: "movie",
    title: "Parasite",
    tagline: "Une maison, deux mondes, un escalier.",
    emoji: "🏠",
    tags: ["thriller", "coreen"],
    duration: 132, rating: 8.5, platform: "canal",
  },
  {
    id: "pulp-fiction",
    category: "movie",
    title: "Pulp Fiction",
    tagline: "Des dialogues, une mallette, aucune chronologie.",
    emoji: "🍔",
    tags: ["classique", "polar"],
    duration: 154, rating: 8.9, platform: "netflix",
  },
  {
    id: "les-evades",
    category: "movie",
    title: "Les Évadés",
    tagline: "L'espoir, la pluie, un poster au mur.",
    emoji: "🌧️",
    tags: ["drame", "classique"],
    duration: 142, rating: 9.3, platform: "prime",
  },
  {
    id: "forrest-gump",
    category: "movie",
    title: "Forrest Gump",
    tagline: "La vie comme une boîte de chocolats.",
    emoji: "🍫",
    tags: ["drame", "classique"],
    duration: 142, rating: 8.8, platform: "netflix",
  },
  {
    id: "matrix",
    category: "movie",
    title: "Matrix",
    tagline: "La pilule rouge, les lunettes noires.",
    emoji: "🟥",
    tags: ["science-fiction", "action"],
    duration: 136, rating: 8.7, platform: "netflix",
  },
  {
    id: "seigneur-des-anneaux",
    category: "movie",
    title: "Le Seigneur des anneaux",
    tagline: "La communauté, la montagne, les paysages.",
    emoji: "💍",
    tags: ["fantastique", "aventure"],
    duration: 178, rating: 8.8, platform: "prime",
  },
  {
    id: "harry-potter",
    category: "movie",
    title: "Harry Potter",
    tagline: "Poudlard, le train, la baguette qui choisit.",
    emoji: "⚡",
    tags: ["fantastique", "aventure"],
    duration: 152, rating: 7.6, platform: "netflix",
  },
  {
    id: "star-wars",
    category: "movie",
    title: "Star Wars",
    tagline: "Une galaxie lointaine, très lointaine.",
    emoji: "⭐",
    tags: ["science-fiction", "aventure"],
    duration: 121, rating: 8.6, platform: "canal",
  },
  {
    id: "jurassic-park",
    category: "movie",
    title: "Jurassic Park",
    tagline: "Des dinosaures, un parc, une mauvaise idée.",
    emoji: "🦖",
    tags: ["aventure", "classique"],
    duration: 127, rating: 8.2, platform: "netflix",
  },
  {
    id: "alien",
    category: "movie",
    title: "Alien",
    tagline: "Dans l'espace, personne ne vous entend crier.",
    emoji: "👽",
    tags: ["horreur", "science-fiction"],
    duration: 117, rating: 8.5, platform: "prime",
  },
  {
    id: "get-out",
    category: "movie",
    title: "Get Out",
    tagline: "Un sourire poli qui devient vite inquiétant.",
    emoji: "👀",
    tags: ["horreur", "thriller"],
    duration: 104, rating: 7.8, platform: "netflix",
  },
  {
    id: "midsommar",
    category: "movie",
    title: "Midsommar",
    tagline: "Pleine lumière, fleurs et malaise croissant.",
    emoji: "🌼",
    tags: ["horreur", "suedois"],
    duration: 148, rating: 7.1, platform: "prime",
  },
  {
    id: "conjuring",
    category: "movie",
    title: "Conjuring",
    tagline: "Une maison, des bruits, une lampe de poche.",
    emoji: "🕯️",
    tags: ["horreur", "maison"],
    duration: 112, rating: 7.3, platform: "netflix",
  },
  {
    id: "spider-verse",
    category: "movie",
    title: "Spider-Man : Across the Spider-Verse",
    tagline: "Chaque image est une affiche.",
    emoji: "🕸️",
    tags: ["animation", "action"],
    duration: 140, rating: 8.6, platform: "netflix",
  },
  {
    id: "totoro",
    category: "movie",
    title: "Mon voisin Totoro",
    tagline: "Le chat-bus et la sieste sous la pluie.",
    emoji: "🐈",
    tags: ["animation", "doux"],
    duration: 86, rating: 8.1, platform: "netflix",
  },
  {
    id: "chihiro",
    category: "movie",
    title: "Le Voyage de Chihiro",
    tagline: "Des esprits, un bain public, un tunnel.",
    emoji: "🏮",
    tags: ["animation", "japonais"],
    duration: 125, rating: 8.6, platform: "netflix",
  },
  {
    id: "coco",
    category: "movie",
    title: "Coco",
    tagline: "La musique, les ancêtres, les larmes faciles.",
    emoji: "🎸",
    tags: ["animation", "famille"],
    duration: 105, rating: 8.4, platform: "prime",
  },
  {
    id: "la-haut",
    category: "movie",
    title: "Là-haut",
    tagline: "Des ballons, une maison, un vieux monsieur.",
    emoji: "🎈",
    tags: ["animation", "famille"],
    duration: 96, rating: 8.3, platform: "prime",
  },
  {
    id: "grand-budapest",
    category: "movie",
    title: "The Grand Budapest Hotel",
    tagline: "Symétrie parfaite et concierge légendaire.",
    emoji: "🛎️",
    tags: ["comedie", "esthetique"],
    duration: 99, rating: 8.1, platform: "canal",
  },
  {
    id: "a-couteaux-tires",
    category: "movie",
    title: "À couteaux tirés",
    tagline: "Un whodunit confortable avec des pulls larges.",
    emoji: "🔪",
    tags: ["polar", "comedie"],
    duration: 130, rating: 7.9, platform: "netflix",
  },
  {
    id: "gone-girl",
    category: "movie",
    title: "Gone Girl",
    tagline: "Un anniversaire de mariage qui dérape.",
    emoji: "📓",
    tags: ["thriller", "drame"],
    duration: 149, rating: 8.1, platform: "prime",
  },
  {
    id: "portrait-femme-en-feu",
    category: "movie",
    title: "Portrait de la jeune fille en feu",
    tagline: "Des regards, du feu, une île.",
    emoji: "🔥",
    tags: ["romantique", "francais"],
    duration: 122, rating: 8.1, platform: "salle",
  },
  {
    id: "demoiselles-rochefort",
    category: "movie",
    title: "Les Demoiselles de Rochefort",
    tagline: "Des couleurs vives et des chorégraphies en plein air.",
    emoji: "🎺",
    tags: ["musique", "classique"],
    duration: 120, rating: 7.7, platform: "salle",
  },
  {
    id: "le-samourai",
    category: "movie",
    title: "Le Samouraï",
    tagline: "Un imperméable, un chapeau, très peu de mots.",
    emoji: "🕶️",
    tags: ["polar", "classique"],
    duration: 105, rating: 8.0, platform: "salle",
  },
  {
    id: "oss-117",
    category: "movie",
    title: "OSS 117 : Le Caire, nid d'espions",
    tagline: "Un agent sûr de lui, des répliques absurdes.",
    emoji: "🕵️",
    tags: ["comedie", "francais"],
    duration: 99, rating: 7.3, platform: "netflix",
  },
  {
    id: "truman-show",
    category: "movie",
    title: "The Truman Show",
    tagline: "Une vie en direct, un bateau au bout du décor.",
    emoji: "📺",
    tags: ["drame", "science-fiction"],
    duration: 103, rating: 8.2, platform: "prime",
  },
  {
    id: "eternal-sunshine",
    category: "movie",
    title: "Eternal Sunshine of the Spotless Mind",
    tagline: "Effacer l'autre, puis regretter.",
    emoji: "🧠",
    tags: ["romantique", "science-fiction"],
    duration: 108, rating: 8.3, platform: "netflix",
  },
  {
    id: "before-sunrise",
    category: "movie",
    title: "Before Sunrise",
    tagline: "Une nuit à Vienne, une conversation sans fin.",
    emoji: "🌅",
    tags: ["romantique", "drame"],
    duration: 101, rating: 8.1, platform: "canal",
  },
  {
    id: "lost-in-translation",
    category: "movie",
    title: "Lost in Translation",
    tagline: "Tokyo, deux solitudes, un bar d'hôtel.",
    emoji: "🏨",
    tags: ["romantique", "drame"],
    duration: 102, rating: 7.7, platform: "prime",
  },
  {
    id: "drive",
    category: "movie",
    title: "Drive",
    tagline: "Néon, gants, silence et moteur.",
    emoji: "🚗",
    tags: ["thriller", "esthetique"],
    duration: 100, rating: 7.8, platform: "netflix",
  },
  {
    id: "mad-max-fury-road",
    category: "movie",
    title: "Mad Max: Fury Road",
    tagline: "Le désert à plein régime, sans pause.",
    emoji: "🏜️",
    tags: ["action", "aventure"],
    duration: 120, rating: 8.1, platform: "prime",
  },
  {
    id: "little-miss-sunshine",
    category: "movie",
    title: "Little Miss Sunshine",
    tagline: "Un van jaune, une famille, un concours.",
    emoji: "🚌",
    tags: ["comedie", "famille"],
    duration: 101, rating: 7.8, platform: "netflix",
  },
  {
    id: "moonrise-kingdom",
    category: "movie",
    title: "Moonrise Kingdom",
    tagline: "Deux enfants, une fugue, une île.",
    emoji: "⛺",
    tags: ["romantique", "doux"],
    duration: 94, rating: 7.8, platform: "canal",
  },
];

/** Sélection éditoriale + catalogue IMDb (films et séries). */
export const CHOICES: Choice[] = [...CURATED_CHOICES, ...IMDB_CHOICES];

export const CHOICES_BY_ID: ReadonlyMap<string, Choice> = new Map(
  CHOICES.map((choice) => [choice.id, choice]),
);

export const CHOICES_BY_CATEGORY: Readonly<
  Record<ChoiceCategory, readonly Choice[]>
> = {
  food: CHOICES.filter((choice) => choice.category === "food"),
  movie: CHOICES.filter((choice) => choice.category === "movie"),
};

export const CHOICE_CATEGORY_META: Readonly<
  Record<
    ChoiceCategory,
    {
      label: string;
      plural: string;
      kicker: string;
      gradient: readonly [string, string];
      emptyTitle: string;
      emptyText: string;
    }
  >
> = {
  food: {
    label: "Nourriture",
    plural: "Les plats",
    kicker: "À table",
    gradient: ["#8c3a2e", "#4a0d14"],
    emptyTitle: "Tout est passé à table",
    emptyText:
      "Vous avez swipé toutes les cartes de cette catégorie. Les matchs restent visibles ci-dessus.",
  },
  movie: {
    label: "Films",
    plural: "Les films",
    kicker: "À l'écran",
    gradient: ["#4b3560", "#221a2f"],
    emptyTitle: "Générique de fin",
    emptyText:
      "Vous avez swipé toutes les cartes de cette catégorie. Les matchs restent visibles ci-dessus.",
  },
};

/** Ordre déterministe pour une session et une catégorie. */
export function rankChoices(
  category: ChoiceCategory,
  seed: string,
): Choice[] {
  const random = mulberry32(hashSeed(`${seed}:${category}`));
  const deck = [...CHOICES_BY_CATEGORY[category]];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = deck[index]!;
    deck[index] = deck[swap]!;
    deck[swap] = current;
  }
  return deck;
}

export const FOOD_MODE_META: Record<
  FoodMode,
  { label: string; emoji: string }
> = {
  cuisiner: { label: "À cuisiner", emoji: "🏠" },
  livraison: { label: "Livraison", emoji: "🛵" },
  restaurant: { label: "Restaurant", emoji: "🍽️" },
};

export const MOVIE_PLATFORM_LABEL: Record<MoviePlatform, string> = {
  netflix: "Netflix",
  prime: "Prime Video",
  canal: "Canal+",
  salle: "Au cinéma",
};

export function budgetLabel(budget: 1 | 2 | 3): string {
  return "€".repeat(budget);
}

/** « 1 h 55 », « 2 h » ou « 25 min ». */
export function formatChoiceDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}
