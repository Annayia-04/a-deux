/**
 * Construit lib/posters.ts : affiches des films, depuis les pages Wikipédia.
 *
 * Les affiches ne sont pas dans les datasets IMDb ; Wikipédia expose l'affiche
 * de la page du film. Les URLs sont stockées dans un manifeste local, chargées
 * paresseusement par la carte, avec l'emoji en secours.
 *
 * Usage : node scripts/build-posters.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

import { CURATED_EN_TITLES } from "./curated-en-titles.mjs";


function normalizeUrl(url) {
  if (!url) return null;
  const clean = url.split("?")[0];
  if (!clean.startsWith("https://upload.wikimedia.org/")) return null;
  return clean;
}

async function pageInfo(title) {
  const slug = encodeURIComponent(title.replaceAll(" ", "_"));
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
    {
      headers: { "user-agent": "a-deux/2.3 (posters)" },
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok) return null;
  const data = await response.json();
  if (data.type === "disambiguation") return null;
  return {
    title: data.title ?? title,
    description: data.description ?? "",
    image: normalizeUrl(
      data.thumbnail?.source ?? data.originalimage?.source ?? null,
    ),
  };
}

async function resolveExact(candidates) {
  for (const title of candidates) {
    try {
      const info = await pageInfo(title);
      if (info?.image) return info.image;
    } catch {
      // On continue avec la variante suivante.
    }
    await sleep(60);
  }
  return null;
}

async function searchPoster(query, year) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query,
  )}&srlimit=4&format=json&origin=*`;
  const response = await fetch(url, {
    headers: { "user-agent": "a-deux/2.3 (posters)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const pages = data.query?.search?.map((item) => item.title) ?? [];
  for (const page of pages.slice(0, 3)) {
    const info = await pageInfo(page);
    if (!info?.image) continue;
    if (year) {
      const text = `${info.title} ${info.description}`;
      if (!text.includes(String(year))) continue;
    }
    return info.image;
  }
  return null;
}

function scoreFile(name) {
  if (/poster/i.test(name)) return 3;
  if (/(logo|title card|intertitle|cover)/i.test(name)) return 2;
  return 0;
}

function usableFile(name) {
  return (
    scoreFile(name) > 0 &&
    !/commons-logo|wikiquote|wiktionary|symbol|flag|icon|blank|ipod|masked man|dragon|global thinking|family tree/i.test(
      name,
    )
  );
}

async function fileUrl(fileTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    fileTitle,
  )}&prop=imageinfo&iiprop=url&format=json`;
  const response = await fetch(url, {
    headers: { "user-agent": "a-deux/2.3 (posters)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const page = Object.values(data.query?.pages ?? {})[0];
  return normalizeUrl(page?.imageinfo?.[0]?.url ?? null);
}

async function posterFromImages(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title,
  )}&prop=images&imlimit=30&format=json&redirects=1`;
  const response = await fetch(url, {
    headers: { "user-agent": "a-deux/2.3 (posters)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const page = Object.values(data.query?.pages ?? {})[0];
  const files = (page?.images ?? [])
    .map((item) => item.title)
    .filter(usableFile)
    .sort((a, b) => scoreFile(b) - scoreFile(a));
  for (const file of files.slice(0, 2)) {
    const image = await fileUrl(file);
    if (image) return image;
  }
  return null;
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
  const posters = {};
  let curatedFound = 0;
  let imdbFound = 0;

  const curated = curatedMovies();
  for (const movie of curated) {
    const candidates = [
      ...(CURATED_EN_TITLES[movie.id] ?? []),
      movie.title,
      `${movie.title} (film)`,
    ];
    const image = await resolveExact(candidates);
    if (image) {
      posters[movie.id] = image;
      curatedFound += 1;
    }
    process.stdout.write(`.`);
  }
  console.log(`\néditorial : ${curatedFound}/${curated.length}`);

  const choices = imdbChoices();
  for (const [index, choice] of choices.entries()) {
    const series = choice.kind === "series";
    const candidates = [
      choice.title,
      `${choice.title} (${series ? "TV series" : "film"})`,
    ];
    let image = await resolveExact(candidates);
    if (!image) {
      image = await searchPoster(
        `${choice.title} ${series ? "TV series" : "film"}`,
        choice.year,
      );
    }
    if (!image) {
      image = await posterFromImages(candidates[0]);
    }
    if (image) {
      posters[choice.id] = image;
      imdbFound += 1;
    }
    if (index % 20 === 0) process.stdout.write(`+`);
  }
  console.log(`
IMDb (films + séries) : ${imdbFound}/${choices.length}`);

  const entries = Object.entries(posters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, url]) => `  "${id}": ${JSON.stringify(url)},`)
    .join("\n");

  writeFileSync(
    "lib/posters.ts",
    `/**
 * Affiches des films, résolues depuis les pages Wikipédia.
 * Généré par scripts/build-posters.mjs — ne pas modifier à la main.
 * Les images sont chargées depuis upload.wikimedia.org, avec l'emoji en
 * secours si l'affiche est absente ou indisponible.
 */
export const MOVIE_POSTERS: Record<string, string> = {
${entries}
};
`,
    "utf8",
  );
  console.log(`lib/posters.ts : ${Object.keys(posters).length} affiches`);
}

await main();
