/**
 * Complète lib/posters.ts avec les affiches TMDb.
 *
 * La clé n'est jamais écrite dans le dépôt : elle est lue dans
 * `TMDB_API_KEY` (clé v3) ou `TMDB_READ_ACCESS_TOKEN` (jeton v4).
 *
 * Usage :
 *   node --env-file=.env.local scripts/build-tmdb-posters.mjs
 *
 * Les affiches déjà résolues via Wikipédia restent en secours pour les titres
 * que TMDb ne trouve pas.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { CURATED_EN_TITLES } from "./curated-en-titles.mjs";

const RAW_KEY = (process.env.TMDB_API_KEY ?? "").trim().replace(/^"|"$/g, "");
const RAW_TOKEN = (process.env.TMDB_READ_ACCESS_TOKEN ?? "")
  .trim()
  .replace(/^"|"$/g, "");
const RAW = RAW_KEY || RAW_TOKEN;
const IS_V4 = RAW.startsWith("eyJ");
const API_KEY = IS_V4 ? "" : RAW_KEY;
const READ_TOKEN = IS_V4 ? RAW : RAW_TOKEN;

if (!API_KEY && !READ_TOKEN) {
  console.error(
    "TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN absent. Ajoutez-le à .env.local (jamais dans le chat).",
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseExistingPosters() {
  const source = readFileSync("lib/posters.ts", "utf8");
  const posters = {};
  for (const match of source.matchAll(
    /^\s*"([^"]+)":\s*"([^"]+)",?$/gm,
  )) {
    posters[match[1]] = match[2];
  }
  return posters;
}

async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  if (API_KEY) url.searchParams.set("api_key", API_KEY);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, {
      headers: READ_TOKEN ? { authorization: `Bearer ${READ_TOKEN}` } : {},
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 429 && attempt === 0) {
      await sleep(1200);
      continue;
    }
    if (!response.ok) return null;
    return response.json();
  }
  return null;
}

function posterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w500${path}` : null;
}

async function findByImdb(imdbId) {
  const data = await tmdb(`/find/${imdbId}`, {
    external_source: "imdb_id",
    language: "fr-FR",
  });
  if (!data) return null;
  const hit = data.movie_results?.[0] ?? data.tv_results?.[0];
  return posterUrl(hit?.poster_path ?? null);
}

function searchTitle(raw) {
  const year = raw.match(/\((\d{4})(?:\s+film)?\)/)?.[1];
  const query = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return { query, year };
}

async function searchPoster(title, year, series = false) {
  const { query, year: titleYear } = searchTitle(title);
  const endpoint = series ? "/search/tv" : "/search/movie";
  const params = series
    ? { query, first_air_date_year: year ?? titleYear, language: "fr-FR" }
    : { query, year: year ?? titleYear, language: "fr-FR" };

  let data = await tmdb(endpoint, params);
  if (!data?.results?.length) {
    data = await tmdb(endpoint, { query, language: "fr-FR" });
  }
  const hit = data?.results?.[0];
  return posterUrl(hit?.poster_path ?? null);
}

function imdbChoices() {
  const source = readFileSync("lib/imdb-choices.ts", "utf8");
  const json = source.slice(
    source.indexOf("= [") + 2,
    source.lastIndexOf("];") + 1,
  );
  return JSON.parse(json);
}

function curatedMovies() {
  const source = readFileSync("lib/choices.ts", "utf8");
  const curated = source.slice(0, source.indexOf("/** Sélection éditoriale"));
  const movies = [];
  const pattern =
    /id: "([^"]+)",\s*category: "movie",\s*title: "([^"]+)"/g;
  let match;
  while ((match = pattern.exec(curated))) {
    movies.push({ id: match[1], title: match[2] });
  }
  return movies;
}

async function main() {
  const posters = parseExistingPosters();
  const before = Object.keys(posters).length;
  let tmdbCount = 0;
  let curatedCount = 0;
  let imdbCount = 0;

  for (const movie of curatedMovies()) {
    const title = CURATED_EN_TITLES[movie.id]?.[0] ?? movie.title;
    const image =
      (movie.id.startsWith("tt") ? await findByImdb(movie.id) : null) ??
      (await searchPoster(title, undefined, false));
    if (image) {
      posters[movie.id] = image;
      tmdbCount += 1;
      curatedCount += 1;
    }
    process.stdout.write(".");
    await sleep(35);
  }
  console.log(`\néditorial TMDb : ${curatedCount}/40`);

  const choices = imdbChoices();
  for (const [index, choice] of choices.entries()) {
    const image =
      (await findByImdb(choice.id)) ??
      (await searchPoster(choice.title, choice.year, choice.kind === "series"));
    if (image) {
      posters[choice.id] = image;
      tmdbCount += 1;
      imdbCount += 1;
    }
    if (index % 20 === 0) process.stdout.write("+");
    await sleep(35);
  }
  console.log(`\nIMDb TMDb : ${imdbCount}/${choices.length}`);
  console.log(`TMDb : ${tmdbCount} affiches, manifeste ${before} → ${Object.keys(posters).length}`);

  const entries = Object.entries(posters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, url]) => `  "${id}": ${JSON.stringify(url)},`)
    .join("\n");

  writeFileSync(
    "lib/posters.ts",
    `/**
 * Affiches des films et séries.
 * Résolues via TMDb (principal) et Wikipédia (secours).
 * Généré par scripts/build-tmdb-posters.mjs — ne pas modifier à la main.
 * Les images sont chargées paresseusement depuis image.tmdb.org ou
 * upload.wikimedia.org, avec l'emoji en secours.
 */
export const MOVIE_POSTERS: Record<string, string> = {
${entries}
};
`,
    "utf8",
  );
}

await main();
