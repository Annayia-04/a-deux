/**
 * Génère lib/imdb-choices.ts à partir des datasets publics IMDb.
 *
 * Source : https://datasets.imdbws.com/
 *   - title.basics.tsv.gz
 *   - title.ratings.tsv.gz
 *
 * Usage :
 *   node scripts/build-imdb-catalog.mjs [dossier-des-tsv.gz]
 *
 * Les datasets IMDb sont fournis pour un usage personnel et non commercial.
 * Le fichier généré est versionné ; ce script n'est pas exécuté à l'exécution.
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import os from "node:os";
import path from "node:path";

const dir = process.argv[2] ?? os.tmpdir();
const basicsPath = path.join(dir, "title.basics.tsv.gz");
const ratingsPath = path.join(dir, "title.ratings.tsv.gz");

const GENRES = {
  Comedy: ["comedie", "😂"],
  Drama: ["drame", "🎭"],
  Action: ["action", "💥"],
  "Sci-Fi": ["science-fiction", "🚀"],
  Horror: ["horreur", "👻"],
  Romance: ["romantique", "💌"],
  Animation: ["animation", "🎨"],
  Adventure: ["aventure", "🧭"],
  Fantasy: ["fantastique", "🐉"],
  Mystery: ["mystere", "🔍"],
  Crime: ["polar", "🕵️"],
  Family: ["famille", "👨‍👩‍👧"],
  Music: ["musique", "🎵"],
  Musical: ["musique", "🎵"],
  War: ["guerre", "⚔️"],
  Western: ["western", "🤠"],
  Biography: ["biographie", "📖"],
  History: ["histoire", "🏛️"],
  Sport: ["sport", "🏅"],
  Documentary: ["documentaire", "🎞️"],
  "Film-Noir": ["classique", "🎞️"],
};

const GENRE_LABELS = {
  comedie: "Comédie",
  drame: "Drame",
  action: "Action",
  "science-fiction": "Science-fiction",
  horreur: "Horreur",
  romantique: "Romance",
  animation: "Animation",
  aventure: "Aventure",
  fantastique: "Fantastique",
  mystere: "Mystère",
  polar: "Polar",
  famille: "Famille",
  musique: "Musique",
  guerre: "Guerre",
  western: "Western",
  biographie: "Biographie",
  histoire: "Histoire",
  sport: "Sport",
  documentaire: "Documentaire",
  classique: "Classique",
};

const SKIP_GENRES = new Set([
  "Reality-TV",
  "Talk-Show",
  "News",
  "Game-Show",
  "Adult",
]);

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function addYears(year) {
  const current = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1970 && year <= current;
}

async function main() {
  // Titres déjà présents dans le catalogue éditorial : on évite les doublons.
  const curated = new Set();
  const choicesSource = readFileSync("lib/choices.ts", "utf8");
  for (const match of choicesSource.matchAll(/title: "([^"]+)"/g)) {
    curated.add(normalize(match[1]));
  }

  // Notes et nombre de votes.
  const ratings = new Map();
  const ratingLines = createInterface({
    input: createReadStream(ratingsPath).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let header = true;
  for await (const line of ratingLines) {
    if (header) {
      header = false;
      continue;
    }
    const [tconst, rating, votes] = line.split("\t");
    const score = Number(rating);
    const count = Number(votes);
    if (score >= 7 && count >= 50_000) {
      ratings.set(tconst, { rating: score, votes: count });
    }
  }
  console.log(`notes retenues : ${ratings.size}`);

  const candidates = [];
  const seenTitles = new Set();
  const basics = createInterface({
    input: createReadStream(basicsPath).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let first = true;
  for await (const line of basics) {
    if (first) {
      first = false;
      continue;
    }
    const [
      tconst,
      titleType,
      primaryTitle,
      ,
      isAdult,
      startYear,
      ,
      runtimeMinutes,
      genresRaw,
    ] = line.split("\t");

    if (titleType !== "movie" && titleType !== "tvSeries") continue;
    if (isAdult !== "0") continue;

    const rating = ratings.get(tconst);
    if (!rating) continue;

    const year = Number(startYear);
    if (!addYears(year)) continue;
    if (primaryTitle.length < 2 || primaryTitle.length > 80) continue;

    const runtime = Number(runtimeMinutes);
    if (!Number.isFinite(runtime)) continue;
    if (titleType === "movie" && (runtime < 85 || runtime > 210)) continue;
    if (titleType === "tvSeries" && (runtime < 25 || runtime > 90)) continue;

    const rawGenres = genresRaw.split(",");
    if (rawGenres.some((genre) => SKIP_GENRES.has(genre))) continue;

    const mapped = rawGenres
      .map((genre) => GENRES[genre])
      .filter(Boolean)
      .slice(0, 3);
    if (mapped.length === 0) continue;

    const tags = [...new Set(mapped.map(([tag]) => tag))];
    const emoji = mapped[0][1];
    const key = normalize(primaryTitle);
    if (!key || curated.has(key) || seenTitles.has(key)) continue;
    seenTitles.add(key);

    const kind = titleType === "tvSeries" ? "series" : "movie";
    const parts = tags.slice(0, 2).map((tag) => {
      const label = GENRE_LABELS[tag] ?? "film";
      const prefix = /^[aeiouyàâäéèêëîïôöûü]/i.test(label) ? "d’" : "de ";
      return `${prefix}${label.toLowerCase()}`;
    });
    const tagline = `${kind === "series" ? "Une série" : "Un film"} ${
      parts.length > 0 ? `${parts.join(" et ")} ` : ""
    }de ${year}.`;

    candidates.push({
      id: tconst,
      category: "movie",
      title: primaryTitle,
      tagline: tagline.slice(0, 120),
      emoji,
      tags,
      duration: runtime,
      rating: Number(rating.rating.toFixed(1)),
      kind,
      score: rating.rating * Math.log10(rating.votes + 1),
    });
  }

  const movies = candidates
    .filter((choice) => choice.kind === "movie")
    .sort((a, b) => b.score - a.score)
    .slice(0, 240)
    .map(({ score, ...choice }) => choice);

  const series = candidates
    .filter((choice) => choice.kind === "series")
    .sort((a, b) => b.score - a.score)
    .slice(0, 120)
    .map(({ score, ...choice }) => choice);

  const all = [...movies, ...series];
  if (all.length < 320) {
    throw new Error(`Catalogue IMDb trop pauvre : ${all.length}`);
  }

  const body = JSON.stringify(all, null, 2);
  const file = `import type { Choice } from "@/lib/types";

/**
 * Catalogue IMDb généré par scripts/build-imdb-catalog.mjs.
 * Source : datasets.imdbws.com (usage personnel, non commercial).
 * Ne pas modifier à la main : relancer le script.
 */
export const IMDB_CHOICES: Choice[] = ${body};
`;

  writeFileSync("lib/imdb-choices.ts", file, "utf8");
  console.log(
    `lib/imdb-choices.ts : ${movies.length} films, ${series.length} séries`,
  );
}

await main();
