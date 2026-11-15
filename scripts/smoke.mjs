/**
 * Test de fumée HTTP (serveur de production démarré requis).
 * Usage : node scripts/smoke.mjs [baseUrl]
 *
 * Vérifie le parcours complet (session, deck, swipe, undo, résultats SSR)
 * ainsi que les garde-fous : CSRF, validation, cookies, CSP, rate limit.
 */
import assert from "node:assert/strict";

const BASE = process.argv[2] ?? "http://localhost:3000";
const ORIGIN = BASE;
const IS_HTTPS = BASE.startsWith("https://");

let cookie = "";
let failures = 0;

function record(name, error) {
  failures += 1;
  console.error(`✗ ${name}`);
  console.error(`  ${error?.message ?? error}`);
}

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    record(name, error);
  }
}

function baseHeaders(cookieValue, extra = {}) {
  return {
    origin: ORIGIN,
    accept: "application/json",
    ...(cookieValue ? { cookie: cookieValue } : {}),
    ...extra,
  };
}

function headers(extra = {}) {
  return baseHeaders(cookie, extra);
}

async function requestAs(cookieValue, path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: baseHeaders(cookieValue, options.headers),
    redirect: "manual",
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { response, data, text };
}

async function api(path, options = {}) {
  return requestAs(cookie, path, options);
}

function extractCookie(response) {
  const raw = response.headers.getSetCookie().join("\n");
  const match = raw.match(/date_swipe_session=([^;]+)/);
  return match ? `date_swipe_session=${match[1]}` : "";
}

/** Crée une session indépendante (un « navigateur » séparé). */
async function createClient(ip, prefs = PREFS) {
  const result = await requestAs("", "/api/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ prefs }),
  });
  assert.equal(result.response.status, 201, result.text);
  const value = extractCookie(result.response);
  assert.ok(value, "cookie de session absent");
  return { cookie: value, snapshot: result.data };
}

function clientApi(client, path, options = {}) {
  return requestAs(client.cookie, path, options);
}

const PREFS = {
  budget: 80,
  setting: "outdoor",
  time: "evening",
  energy: "calm",
  themes: ["nature"],
};

const session = await api("/api/session", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-forwarded-for": "203.0.113.10",
  },
  body: JSON.stringify({ prefs: PREFS }),
});

let snapshot = null;

function htmlHasTitle(html, title) {
  return (
    html.includes(title) || html.includes(title.replaceAll("&", "&amp;"))
  );
}

await check("création de session (201) + cookie HttpOnly", () => {
  assert.equal(session.response.status, 201);
  const setCookies = session.response.headers.getSetCookie();
  assert.ok(setCookies.length > 0, "aucun Set-Cookie");
  const raw = setCookies.join("\n");
  assert.match(raw, /HttpOnly/i);
  assert.match(raw, /SameSite=lax/i);
  if (IS_HTTPS) {
    assert.match(raw, /Secure/i, "cookie non Secure en HTTPS");
  } else {
    assert.doesNotMatch(raw, /Secure/i, "cookie Secure en HTTP local");
  }
  const match = raw.match(/date_swipe_session=([^;]+)/);
  assert.ok(match, "cookie de session absent");
  cookie = `date_swipe_session=${match[1]}`;
  snapshot = session.data;
  assert.ok(snapshot.ideas.length > 0);
  assert.equal(snapshot.total, snapshot.ideas.length);
  assert.equal(snapshot.likedIdeas.length, 0);
});

await check("le deck respecte les préférences", () => {
  for (const idea of snapshot.ideas) {
    assert.ok(idea.budget <= 80, `${idea.id} hors budget`);
    assert.notEqual(idea.setting, "indoor", `${idea.id} intérieur`);
    assert.ok(idea.themes.includes("nature"), `${idea.id} hors thème`);
  }
});

const firstIdea = snapshot?.ideas[0];
const secondIdea = snapshot?.ideas[1];

await check("la page rend le deck côté serveur avec CSP à nonce", async () => {
  const response = await fetch(`${BASE}/`, {
    headers: { ...headers(), accept: "text/html" },
  });
  assert.equal(response.status, 200, "page d'accueil indisponible");
  const html = await response.text();
  assert.match(html, /Détails de l’idée/);
  assert.ok(htmlHasTitle(html, firstIdea.title), "première carte absente du HTML");
  assert.match(html, /aria-valuenow="0"/);
  assert.match(
    response.headers.get("cache-control") ?? "",
    /no-store/,
    "la page ne doit pas être mise en cache",
  );

  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /script-src 'self' 'nonce-/);
  assert.match(csp, /frame-ancestors 'none'/);
  if (!IS_HTTPS) {
    assert.doesNotMatch(
      csp,
      /upgrade-insecure-requests/,
      "les assets HTTP locale ne doivent pas être forcés en HTTPS",
    );
  }
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, "nonce CSP absent");
  assert.ok(
    html.includes(`nonce="${nonce}"`),
    "les scripts ne portent pas le nonce",
  );
});

await check("swipe like enregistré", async () => {
  const result = await api("/api/swipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ideaId: firstIdea.id, direction: "like" }),
  });
  assert.equal(result.response.status, 200, result.text);
  assert.equal(result.data.ok, true);
  assert.equal(result.data.swiped, 1);
});

await check("état rechargé : progression et envie visibles", async () => {
  const response = await fetch(`${BASE}/`, {
    headers: { ...headers(), accept: "text/html" },
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /aria-valuenow="1"/);
  assert.match(html, /1<!-- --> gardée/, "compteur d'envies absent");
  assert.ok(htmlHasTitle(html, secondIdea.title), "carte suivante absente");
});

await check("annulation du dernier swipe", async () => {
  const result = await api("/api/swipes/undo", { method: "POST" });
  assert.equal(result.response.status, 200, result.text);
  assert.equal(result.data.ideaId, firstIdea.id);

  const again = await api("/api/swipes/undo", { method: "POST" });
  assert.equal(again.response.status, 409);
});

await check("annulation refusée sans session", async () => {
  const response = await fetch(`${BASE}/api/swipes/undo`, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      accept: "application/json",
      "x-forwarded-for": "203.0.113.20",
    },
  });
  assert.equal(response.status, 401);
});

await check("CSRF : origine externe refusée", async () => {
  const result = await api("/api/swipes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://evil.example",
    },
    body: JSON.stringify({ ideaId: firstIdea.id, direction: "like" }),
  });
  assert.equal(result.response.status, 403);
});

await check("validation stricte des préférences", async () => {
  const result = await api("/api/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.11",
    },
    body: JSON.stringify({ prefs: { ...PREFS, budget: 9999 } }),
  });
  assert.equal(result.response.status, 400);
});

await check("idée hors sélection refusée", async () => {
  const result = await api("/api/swipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ideaId: "hotel-vue", direction: "like" }),
  });
  assert.equal(result.response.status, 422, result.text);
});

await check("type de contenu refusé", async () => {
  const result = await api("/api/session", {
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "x-forwarded-for": "203.0.113.12",
    },
    body: JSON.stringify({ prefs: PREFS }),
  });
  assert.equal(result.response.status, 415);
});

await check("aperçu du nombre d'idées", async () => {
  const result = await api("/api/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.13",
    },
    body: JSON.stringify({ prefs: { ...PREFS, budget: 0, themes: [] } }),
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.data.count > 0);
});

await check("effacement de session + cookie vidé", async () => {
  const result = await api("/api/session", { method: "DELETE" });
  assert.equal(result.response.status, 200);
  const cleared = result.response.headers.getSetCookie().join("\n");
  assert.match(cleared, /Max-Age=0/);
  cookie = "";
});

await check("la page repasse en configuration après effacement", async () => {
  const response = await fetch(`${BASE}/`, {
    headers: { accept: "text/html" },
  });
  const html = await response.text();
  assert.match(html, /Choisir mes envies/);
});

// ---------------------------------------------------------------------------
// Mode duo : deux navigateurs indépendants
// ---------------------------------------------------------------------------

const ALL_PREFS = {
  budget: null,
  setting: "any",
  time: "any",
  energy: "any",
  themes: [],
};

const ideaOne = "pique-nique-sunset";

let clientA = null;
let clientB = null;
let clientC = null;
let duoCode = null;

await check("création de deux sessions indépendantes", async () => {
  clientA = await createClient("198.51.100.21", ALL_PREFS);
  clientB = await createClient("198.51.100.22", ALL_PREFS);
  clientC = await createClient("198.51.100.23", ALL_PREFS);
  assert.notEqual(clientA.cookie, clientB.cookie);
  assert.ok(clientA.snapshot.couple === null, "duo inattendu dans A");
});

await check("création d'un espace à deux (code à 6 caractères)", async () => {
  const result = await clientApi(clientA, "/api/couple", { method: "POST" });
  assert.equal(result.response.status, 201, result.text);
  duoCode = result.data.couple.code;
  assert.match(duoCode, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(result.data.couple.memberCount, 1);
  assert.equal(result.data.couple.complete, false);
  assert.equal(result.data.couple.matches.length, 0);
  assert.equal(result.data.couple.unread, 0);

  // Double clic : idempotent, même code.
  const again = await clientApi(clientA, "/api/couple", { method: "POST" });
  assert.equal(again.response.status, 201, again.text);
  assert.equal(again.data.couple.code, duoCode);
});

await check("état du duo relu par son créateur", async () => {
  const result = await clientApi(clientA, "/api/couple");
  assert.equal(result.response.status, 200);
  assert.equal(result.data.couple.code, duoCode);
  assert.equal(result.data.couple.memberCount, 1);
});

await check("le partenaire rejoint avec le code (saisie libre)", async () => {
  const result = await clientApi(clientB, "/api/couple/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: `${duoCode.toLowerCase()} ` }),
  });
  assert.equal(result.response.status, 200, result.text);
  assert.equal(result.data.couple.code, duoCode);
  assert.equal(result.data.couple.memberCount, 2);
  assert.equal(result.data.couple.complete, true);
});

await check("un troisième membre est refusé (409)", async () => {
  const result = await clientApi(clientC, "/api/couple/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: duoCode }),
  });
  assert.equal(result.response.status, 409, result.text);
});

await check("codes invalides : format (400) et inconnu (404)", async () => {
  const invalid = await clientApi(clientC, "/api/couple/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "AB" }),
  });
  assert.equal(invalid.response.status, 400, invalid.text);

  const unknown = await clientApi(clientC, "/api/couple/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "ZZZZZZ" }),
  });
  // ZZZZZZ est un code syntaxiquement valide : il ne doit pas exister.
  assert.equal(unknown.response.status, 404, unknown.text);
});

await check("aucune fuite de duo sans session (401)", async () => {
  const result = await requestAs("", "/api/couple");
  assert.equal(result.response.status, 401);
  assert.equal(result.data.couple, undefined);
});

await check("CSRF : création de duo depuis une origine externe (403)", async () => {
  const result = await clientApi(clientA, "/api/couple", {
    method: "POST",
    headers: { origin: "https://evil.example" },
  });
  assert.equal(result.response.status, 403);
});

await check("match mutuel : signalé au second, non lu pour le premier", async () => {
  const first = await clientApi(clientA, "/api/swipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ideaId: ideaOne, direction: "like" }),
  });
  assert.equal(first.response.status, 200, first.text);
  assert.equal(first.data.match, undefined, "match prématuré");

  const second = await clientApi(clientB, "/api/swipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ideaId: ideaOne, direction: "like" }),
  });
  assert.equal(second.response.status, 200, second.text);
  assert.equal(second.data.match?.id, ideaOne);

  const seenByB = await clientApi(clientB, "/api/couple");
  assert.equal(seenByB.data.couple.matches.length, 1);
  assert.equal(seenByB.data.couple.matches[0].seen, true);
  assert.equal(seenByB.data.couple.unread, 0);

  const seenByA = await clientApi(clientA, "/api/couple");
  assert.equal(seenByA.data.couple.matches.length, 1);
  assert.equal(seenByA.data.couple.matches[0].idea.id, ideaOne);
  assert.equal(seenByA.data.couple.matches[0].seen, false);
  assert.equal(seenByA.data.couple.unread, 1);
});

await check("marquage des matchs comme vus", async () => {
  const result = await clientApi(clientA, "/api/couple/seen", {
    method: "POST",
  });
  assert.equal(result.response.status, 200, result.text);
  assert.equal(result.data.couple.unread, 0);
  assert.equal(result.data.couple.matches[0].seen, true);
});

await check("annuler un like supprime le match pour les deux", async () => {
  const undo = await clientApi(clientB, "/api/swipes/undo", { method: "POST" });
  assert.equal(undo.response.status, 200, undo.text);

  const byA = await clientApi(clientA, "/api/couple");
  assert.equal(byA.data.couple.matches.length, 0);
  assert.equal(byA.data.couple.unread, 0);
});

await check("nouveau like : le match est recréé et redevient non lu", async () => {
  const again = await clientApi(clientB, "/api/swipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ideaId: ideaOne, direction: "like" }),
  });
  assert.equal(again.response.status, 200, again.text);
  assert.equal(again.data.match?.id, ideaOne);

  const byA = await clientApi(clientA, "/api/couple");
  assert.equal(byA.data.couple.matches.length, 1);
  assert.equal(byA.data.couple.unread, 1);
});

await check("une nouvelle sélection conserve le duo en place", async () => {
  const result = await clientApi(clientA, "/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefs: ALL_PREFS }),
  });
  assert.equal(result.response.status, 201, result.text);
  assert.equal(result.data.couple?.code, duoCode, "duo perdu au redémarrage");
  assert.equal(result.data.swiped, 0);
  assert.ok(result.data.ideas.length > 0);
});

// ---------------------------------------------------------------------------
// Choix Nourriture / Films
// ---------------------------------------------------------------------------

await check("cartes Nourriture : deck complet, catégorie et accès contrôlés", async () => {
  const byA = await clientApi(clientA, "/api/choices?category=food");
  assert.equal(byA.response.status, 200, byA.text);
  assert.equal(byA.data.category, "food");
  assert.ok(byA.data.total >= 20, "catalogue Nourriture trop petit");
  assert.equal(byA.data.swiped, 0);
  assert.equal(byA.data.deck.length, byA.data.total);
  assert.equal(byA.data.matches.length, 0);

  const unknownCategory = await clientApi(clientA, "/api/choices?category=music");
  assert.equal(unknownCategory.response.status, 400, unknownCategory.text);

  const outsider = await clientApi(clientC, "/api/choices?category=food");
  assert.equal(outsider.response.status, 409, outsider.text);
});

await check("match Nourriture mutuel : célébration côté second, non lu côté premier", async () => {
  const first = await clientApi(clientA, "/api/choices/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: "food",
      choiceId: "pizza-maison",
      direction: "like",
    }),
  });
  assert.equal(first.response.status, 200, first.text);
  assert.equal(first.data.match, null, "match prématuré");

  const second = await clientApi(clientB, "/api/choices/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: "food",
      choiceId: "pizza-maison",
      direction: "like",
    }),
  });
  assert.equal(second.response.status, 200, second.text);
  assert.equal(second.data.match?.id, "pizza-maison");

  const seenByB = await clientApi(clientB, "/api/choices?category=food");
  assert.equal(seenByB.data.matches.length, 1);
  assert.equal(seenByB.data.matches[0].seen, true);
  assert.equal(seenByB.data.unread, 0);

  const seenByA = await clientApi(clientA, "/api/choices?category=food");
  assert.equal(seenByA.data.matches.length, 1);
  assert.equal(seenByA.data.matches[0].choice.title, "Pizza maison");
  assert.equal(seenByA.data.matches[0].seen, false);
  assert.equal(seenByA.data.unread, 1);

  const coupleA = await clientApi(clientA, "/api/couple");
  assert.equal(coupleA.data.couple.choiceMatches.length, 1);
  assert.equal(coupleA.data.couple.choiceUnread, 1);
});

await check("compteur des choix séparé des matchs d'activités", async () => {
  const activitySeen = await clientApi(clientA, "/api/couple/seen", {
    method: "POST",
  });
  assert.equal(activitySeen.response.status, 200, activitySeen.text);
  assert.equal(activitySeen.data.couple.unread, 0);
  assert.equal(
    activitySeen.data.couple.choiceUnread,
    1,
    "les matchs de choix ne doivent pas être marqués vus",
  );

  const choiceSeen = await clientApi(clientA, "/api/choices/seen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ category: "food" }),
  });
  assert.equal(choiceSeen.response.status, 200, choiceSeen.text);
  assert.equal(choiceSeen.data.unread, 0);

  const coupleA = await clientApi(clientA, "/api/couple");
  assert.equal(coupleA.data.couple.choiceUnread, 0);
});

await check("match Films mutuel, indépendant de la catégorie Nourriture", async () => {
  const first = await clientApi(clientB, "/api/choices/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: "movie",
      choiceId: "inception",
      direction: "like",
    }),
  });
  assert.equal(first.response.status, 200, first.text);
  assert.equal(first.data.match, null);

  const second = await clientApi(clientA, "/api/choices/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: "movie",
      choiceId: "inception",
      direction: "like",
    }),
  });
  assert.equal(second.response.status, 200, second.text);
  assert.equal(second.data.match?.id, "inception");

  const byB = await clientApi(clientB, "/api/choices?category=movie");
  assert.equal(byB.data.matches.length, 1);
  assert.equal(byB.data.matches[0].seen, false);
  assert.equal(byB.data.unread, 1);

  const coupleA = await clientApi(clientA, "/api/couple");
  assert.equal(coupleA.data.couple.choiceMatches.length, 2);
  assert.equal(coupleA.data.couple.choiceUnread, 0);
});

await check("carte hors catégorie, inconnue ou champ en trop refusés", async () => {
  const wrongCategory = await clientApi(clientA, "/api/choices/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: "movie",
      choiceId: "pizza-maison",
      direction: "like",
    }),
  });
  assert.equal(wrongCategory.response.status, 400, wrongCategory.text);

  const unknown = await clientApi(clientA, "/api/choices/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: "food",
      choiceId: "lasagne-imaginaire",
      direction: "like",
    }),
  });
  assert.equal(unknown.response.status, 400, unknown.text);

  const extra = await clientApi(clientA, "/api/choices/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category: "food",
      choiceId: "ramen",
      direction: "like",
      coupleId: "autre",
    }),
  });
  assert.equal(extra.response.status, 400, extra.text);
});

// ---------------------------------------------------------------------------
// Journal de souvenirs
// ---------------------------------------------------------------------------

let souvenirId = null;

await check("souvenir créé par A, moment du partenaire encore vide", async () => {
  const created = await clientApi(clientA, "/api/souvenirs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ideaId: ideaOne,
      body: "Le coucher de soleil et les sandwiches.",
    }),
  });
  assert.equal(created.response.status, 201, created.text);
  souvenirId = created.data.souvenir.id;
  assert.match(souvenirId, /^[a-f0-9]{24}$/);
  assert.equal(
    created.data.souvenir.title,
    "Pique-nique au coucher du soleil",
  );
  assert.equal(
    created.data.souvenir.mine,
    "Le coucher de soleil et les sandwiches.",
  );
  assert.equal(created.data.souvenir.partner, null);
  assert.equal(created.data.souvenir.complete, false);

  const byB = await clientApi(clientB, "/api/souvenirs");
  assert.equal(byB.response.status, 200, byB.text);
  assert.equal(byB.data.souvenirs.length, 1);
  assert.equal(byB.data.souvenirs[0].mine, null);
  assert.equal(
    byB.data.souvenirs[0].partner,
    "Le coucher de soleil et les sandwiches.",
  );
});

await check("photos : envoi, lecture privée et suppression", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n1cAAAAASUVORK5CYII=",
    "base64",
  );
  const form = new FormData();
  form.append("photos", new Blob([png], { type: "image/png" }), "souvenir.png");

  const upload = await fetch(`${BASE}/api/souvenirs/${souvenirId}/photos`, {
    method: "POST",
    headers: { cookie: clientA.cookie, origin: ORIGIN },
    body: form,
    redirect: "manual",
  });
  assert.equal(upload.status, 201);
  const uploaded = await upload.json();
  assert.equal(uploaded.souvenir.photos.length, 1);
  assert.equal(uploaded.souvenir.photos[0].mine, true);
  const photoId = uploaded.souvenir.photos[0].id;
  assert.match(photoId, /^[a-f0-9]{24}$/);

  const image = await fetch(`${BASE}/api/souvenirs/photos/${photoId}`, {
    headers: { cookie: clientA.cookie },
    redirect: "manual",
  });
  assert.equal(image.status, 200);
  assert.match(
    image.headers.get("content-type") ?? "",
    /image\/png/,
    "type d’image inattendu",
  );
  assert.ok((await image.arrayBuffer()).byteLength > 0);

  const anonymous = await fetch(`${BASE}/api/souvenirs/photos/${photoId}`, {
    redirect: "manual",
  });
  assert.equal(anonymous.status, 401);

  const byPartner = await fetch(`${BASE}/api/souvenirs/photos/${photoId}`, {
    headers: { cookie: clientB.cookie },
    redirect: "manual",
  });
  assert.equal(byPartner.status, 200);

  const partnerDelete = await fetch(
    `${BASE}/api/souvenirs/photos/${photoId}`,
    {
      method: "DELETE",
      headers: { cookie: clientB.cookie, origin: ORIGIN },
      redirect: "manual",
    },
  );
  assert.equal(partnerDelete.status, 403);

  const ownerDelete = await fetch(`${BASE}/api/souvenirs/photos/${photoId}`, {
    method: "DELETE",
    headers: { cookie: clientA.cookie, origin: ORIGIN },
    redirect: "manual",
  });
  assert.equal(ownerDelete.status, 200);

  const after = await clientApi(clientA, "/api/souvenirs");
  assert.equal(after.data.souvenirs[0].photos.length, 0);
});

await check("chaque partenaire écrit son moment, le souvenir devient complet", async () => {
  const note = await clientApi(
    clientB,
    `/api/souvenirs/${souvenirId}/note`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "La lumière sur l’eau, et le silence." }),
    },
  );
  assert.equal(note.response.status, 200, note.text);
  assert.equal(note.data.souvenir.complete, true);
  assert.equal(note.data.souvenir.mine, "La lumière sur l’eau, et le silence.");

  const byA = await clientApi(clientA, "/api/souvenirs");
  assert.equal(byA.data.souvenirs[0].complete, true);
  assert.equal(byA.data.souvenirs[0].mine, "Le coucher de soleil et les sandwiches.");
  assert.equal(
    byA.data.souvenirs[0].partner,
    "La lumière sur l’eau, et le silence.",
  );
});

await check("souvenir manuel accepté et texte nettoyé", async () => {
  const created = await clientApi(clientB, "/api/souvenirs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "  Dîner   sur les toits  ",
      emoji: "🌙",
      happenedAt: Date.parse("2026-04-12T12:00:00Z"),
      body: "  Un moment  parfait.  ",
    }),
  });
  assert.equal(created.response.status, 201, created.text);
  assert.equal(created.data.souvenir.title, "Dîner sur les toits");
  assert.equal(created.data.souvenir.mine, "Un moment parfait.");
  assert.equal(created.data.souvenir.partner, null);
});

await check("un seul souvenir par idée : le second membre rejoint le premier", async () => {
  const before = (await clientApi(clientA, "/api/souvenirs")).data.souvenirs;

  const first = await clientApi(clientA, "/api/souvenirs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ideaId: "concert-intimiste",
      body: "La scène, tout près.",
    }),
  });
  assert.equal(first.response.status, 201, first.text);

  const second = await clientApi(clientB, "/api/souvenirs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ideaId: "concert-intimiste",
      body: "La guitare à la fin.",
    }),
  });
  assert.equal(second.response.status, 201, second.text);
  assert.equal(
    second.data.souvenir.id,
    first.data.souvenir.id,
    "le souvenir a été dupliqué",
  );
  assert.equal(second.data.souvenir.complete, true);

  const after = (await clientApi(clientA, "/api/souvenirs")).data.souvenirs;
  assert.equal(after.length, before.length + 1, "doublon dans la timeline");
  const merged = after.find(
    (souvenir) => souvenir.id === first.data.souvenir.id,
  );
  assert.equal(merged.mine, "La scène, tout près.");
  assert.equal(merged.partner, "La guitare à la fin.");

  const byB = (await clientApi(clientB, "/api/souvenirs")).data.souvenirs.find(
    (souvenir) => souvenir.id === first.data.souvenir.id,
  );
  assert.equal(byB.mine, "La guitare à la fin.");
  assert.equal(byB.partner, "La scène, tout près.");
});

await check("souvenirs : validation stricte et accès limité au duo", async () => {
  const empty = await clientApi(
    clientB,
    `/api/souvenirs/${souvenirId}/note`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "   " }),
    },
  );
  assert.equal(empty.response.status, 400, empty.text);

  const extra = await clientApi(clientA, "/api/souvenirs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Test", coupleId: "autre" }),
  });
  assert.equal(extra.response.status, 400, extra.text);

  const unknownIdea = await clientApi(clientA, "/api/souvenirs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ideaId: "lasagne-imaginaire" }),
  });
  assert.equal(unknownIdea.response.status, 400, unknownIdea.text);

  const future = await clientApi(clientA, "/api/souvenirs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Dans le futur",
      happenedAt: Date.now() + 48 * 60 * 60 * 1000,
    }),
  });
  assert.equal(future.response.status, 400, future.text);

  const outsiderRead = await clientApi(clientC, "/api/souvenirs");
  assert.equal(outsiderRead.response.status, 409, outsiderRead.text);

  const outsiderNote = await clientApi(
    clientC,
    `/api/souvenirs/${souvenirId}/note`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "Je ne fais pas partie du duo." }),
    },
  );
  assert.equal(outsiderNote.response.status, 409, outsiderNote.text);

  const noSession = await requestAs("", "/api/souvenirs");
  assert.equal(noSession.response.status, 401);
});

// ---------------------------------------------------------------------------
// Pensées rapides (tap)
// ---------------------------------------------------------------------------

await check("tap reçu par le partenaire, puis anti-spam (429 + Retry-After)", async () => {
  const sent = await clientApi(clientA, "/api/taps", { method: "POST" });
  assert.equal(sent.response.status, 201, sent.text);
  const tapId = sent.data.tap.id;
  assert.ok(tapId > 0, "identifiant de tap invalide");

  const spam = await clientApi(clientA, "/api/taps", { method: "POST" });
  assert.equal(spam.response.status, 429, spam.text);
  const retryAfter = Number(spam.response.headers.get("retry-after"));
  assert.ok(retryAfter >= 1, "en-tête Retry-After absent");

  const byB = await clientApi(clientB, "/api/taps");
  assert.equal(byB.response.status, 200, byB.text);
  assert.equal(byB.data.tap.id, tapId);
  assert.ok(byB.data.unread >= 1);

  const seen = await clientApi(clientB, "/api/taps/seen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tapId }),
  });
  assert.equal(seen.response.status, 200, seen.text);

  const after = await clientApi(clientB, "/api/taps");
  assert.equal(after.data.tap, null);
  assert.equal(after.data.unread, 0);
});

await check("tap : curseur borné et accès limité au duo", async () => {
  const spoof = await clientApi(clientB, "/api/taps/seen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tapId: Number.MAX_SAFE_INTEGER }),
  });
  assert.equal(spoof.response.status, 200, spoof.text);

  const outsider = await clientApi(clientC, "/api/taps");
  assert.equal(outsider.response.status, 409, outsider.text);

  const invalid = await clientApi(clientB, "/api/taps/seen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tapId: 0 }),
  });
  assert.equal(invalid.response.status, 400, invalid.text);

  const noSession = await requestAs("", "/api/taps");
  assert.equal(noSession.response.status, 401);
});

await check("widget natif : association, ping sans cookie, révocation", async () => {
  // Corps strict : une clé inconnue est refusée.
  const extra = await clientApi(clientB, "/api/widget/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label: "Smoke", token: "interdit" }),
  });
  assert.equal(extra.response.status, 400, extra.text);

  const paired = await clientApi(clientB, "/api/widget/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label: "Smoke" }),
  });
  assert.equal(paired.response.status, 201, paired.text);
  const token = paired.data.token;
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);

  // Vérification silencieuse du jeton, sans envoyer de ping.
  const status = await fetch(`${BASE}/api/widget/devices/status`, {
    headers: { authorization: `Bearer ${token}` },
    redirect: "manual",
  });
  assert.equal(status.status, 200);

  const statusForged = await fetch(`${BASE}/api/widget/devices/status`, {
    headers: { authorization: `Bearer ${"A".repeat(43)}` },
    redirect: "manual",
  });
  assert.equal(statusForged.status, 401);

  // Sans jeton : refus.
  const anonymous = await fetch(`${BASE}/api/widget/ping`, {
    method: "POST",
    redirect: "manual",
  });
  assert.equal(anonymous.status, 401);

  const forged = await fetch(`${BASE}/api/widget/ping`, {
    method: "POST",
    headers: { authorization: `Bearer ${"A".repeat(43)}` },
    redirect: "manual",
  });
  assert.equal(forged.status, 401);

  // Requête purement native : ni cookie ni Origin.
  const ping = await fetch(`${BASE}/api/widget/ping`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    redirect: "manual",
  });
  assert.equal(ping.status, 201);
  const pingBody = await ping.json();
  assert.ok(pingBody.tap.id > 0);

  const spam = await fetch(`${BASE}/api/widget/ping`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    redirect: "manual",
  });
  assert.equal(spam.status, 429);
  assert.ok(Number(spam.headers.get("retry-after")) >= 1);

  // Le partenaire reçoit bien le ping du widget.
  const byA = await clientApi(clientA, "/api/taps");
  assert.equal(byA.data.tap.id, pingBody.tap.id);
  await clientApi(clientA, "/api/taps/seen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tapId: pingBody.tap.id }),
  });

  // Un autre membre ne peut pas révoquer le jeton (réponse silencieuse).
  await clientApi(clientA, "/api/widget/devices", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });

  // Révocation par le propriétaire : le jeton ne fonctionne plus.
  const second = await clientApi(clientB, "/api/widget/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label: "Smoke 2" }),
  });
  assert.equal(second.response.status, 201, second.text);
  const revoked = await clientApi(clientB, "/api/widget/devices", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: second.data.token }),
  });
  assert.equal(revoked.response.status, 200, revoked.text);

  const afterRevoke = await fetch(`${BASE}/api/widget/ping`, {
    method: "POST",
    headers: { authorization: `Bearer ${second.data.token}` },
    redirect: "manual",
  });
  assert.equal(afterRevoke.status, 401);
});

await check("sortie du duo : matchs supprimés, partenaire conservé", async () => {
  const leave = await clientApi(clientA, "/api/couple", { method: "DELETE" });
  assert.equal(leave.response.status, 200, leave.text);

  const byA = await clientApi(clientA, "/api/couple");
  assert.equal(byA.data.couple, null);

  const byB = await clientApi(clientB, "/api/couple");
  assert.equal(byB.data.couple.memberCount, 1);
  assert.equal(byB.data.couple.matches.length, 0);
  assert.equal(byB.data.couple.choiceMatches.length, 0);
  assert.equal(byB.data.couple.choiceUnread, 0);

  const souvenirsB = await clientApi(clientB, "/api/souvenirs");
  assert.equal(souvenirsB.response.status, 200, souvenirsB.text);
  assert.equal(souvenirsB.data.souvenirs.length, 0);

  const choicesB = await clientApi(clientB, "/api/choices?category=food");
  assert.equal(choicesB.response.status, 200, choicesB.text);
  assert.equal(choicesB.data.matches.length, 0);

  const tapsB = await clientApi(clientB, "/api/taps");
  assert.equal(tapsB.data.tap, null);
  assert.equal(tapsB.data.unread, 0);
});

await check("le dernier membre ferme l'espace, le code expire", async () => {
  const leave = await clientApi(clientB, "/api/couple", { method: "DELETE" });
  assert.equal(leave.response.status, 200, leave.text);

  const rejoin = await clientApi(clientC, "/api/couple/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: duoCode }),
  });
  assert.equal(rejoin.response.status, 404, rejoin.text);
});

await check("rate limit sur la création de session", async () => {
  const ip = "203.0.113.77";
  const statuses = [];
  for (let i = 0; i < 14; i += 1) {
    const result = await api("/api/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ prefs: PREFS }),
    });
    statuses.push(result.response.status);
  }
  assert.ok(
    statuses.includes(429),
    `aucun 429 reçu : ${statuses.join(",")}`,
  );
});

await check("thème : cookie appliqué côté serveur, valeur forgée ignorée", async () => {
  const custom = await fetch(`${BASE}/`, {
    headers: { cookie: "a_deux_theme=minuit" },
  });
  const customHtml = await custom.text();
  assert.match(customHtml, /data-theme="minuit"/);

  const forged = await fetch(`${BASE}/`, {
    headers: { cookie: "a_deux_theme=inconnu" },
  });
  const forgedHtml = await forged.text();
  assert.match(forgedHtml, /data-theme="gothique"/);
});

await check("manifeste PWA servi et complet", async () => {
  const response = await fetch(`${BASE}/manifest.webmanifest`);
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/manifest\+json/,
  );
  const manifest = await response.json();
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3);
  assert.ok(
    manifest.icons.some((icon) => icon.purpose === "maskable"),
    "icône maskable absente",
  );

  // Raccourci de l'icône installée : espace à deux uniquement.
  assert.ok(Array.isArray(manifest.shortcuts), "raccourcis absents");
  const ping = manifest.shortcuts.find((shortcut) =>
    shortcut.url.includes("ping=1"),
  );
  assert.equal(ping, undefined, "le raccourci ping ne doit plus être proposé");
  const duo = manifest.shortcuts.find((shortcut) =>
    shortcut.url.includes("duo=1"),
  );
  assert.ok(duo, "raccourci duo absent");
  for (const shortcut of manifest.shortcuts) {
    assert.ok(shortcut.url.startsWith("/"), shortcut.url);
    assert.ok(shortcut.icons?.length > 0, `icône absente : ${shortcut.name}`);
  }
});

await check("service worker revalidé et autorisé sur toute l'origine", async () => {
  const response = await fetch(`${BASE}/sw.js`);
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /javascript/,
  );
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("service-worker-allowed"), "/");
  const body = await response.text();
  assert.match(body, /offline\.html/);
});

await check("page hors ligne et icônes locales disponibles", async () => {
  const offline = await fetch(`${BASE}/offline.html`);
  assert.equal(offline.status, 200);
  assert.match(await offline.text(), /hors ligne/i);

  for (const icon of [
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/maskable-512.png",
    "/icons/apple-touch-icon.png",
  ]) {
    const response = await fetch(`${BASE}${icon}`);
    assert.equal(response.status, 200, icon);
    assert.equal(response.headers.get("content-type"), "image/png", icon);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(
      Array.from(bytes.slice(0, 4)),
      [0x89, 0x50, 0x4e, 0x47],
      `${icon} n'est pas un PNG`,
    );
  }
});

await check("la page déclare le manifeste et la CSP PWA", async () => {
  const response = await fetch(`${BASE}/`, {
    headers: { ...headers(), accept: "text/html" },
  });
  assert.equal(response.status, 200);
  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /worker-src 'self'/);
  assert.match(csp, /manifest-src 'self'/);
  const html = await response.text();
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /theme-color/);
});

await check("compte : état anonyme et fournisseurs déclarés", async () => {
  const { response, data } = await requestAs("", "/api/account");
  assert.equal(response.status, 200);
  assert.equal(data.account, null);
  assert.ok(Array.isArray(data.providers), "liste de fournisseurs absente");
  for (const provider of data.providers) {
    assert.ok(["google", "apple"].includes(provider), provider);
  }
});

await check("connexion Google : redirection signée ou 503 explicite", async () => {
  const { response, text } = await requestAs("", "/api/auth/google");
  if (response.status === 503) {
    assert.match(text, /pas configurée/i);
    return;
  }
  assert.equal(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assert.match(location, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
  const url = new URL(location);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("state"));
  assert.ok(url.searchParams.get("nonce"));
  assert.equal(url.searchParams.has("client_secret"), false);

  const cookies = response.headers.getSetCookie().join("\n");
  assert.match(cookies, /adeux_oauth=/);
  assert.match(cookies, /HttpOnly/i);
  assert.match(cookies, /Path=\/api\/auth/);
});

await check("callback Google : état absent ou forgé refusé", async () => {
  const { response } = await requestAs(
    "",
    "/api/auth/google/callback?code=faux&state=faux",
  );
  if (response.status === 503) return;
  assert.equal(response.status, 303);
  assert.match(response.headers.get("location") ?? "", /\?compte=etat$/);
});

await check("déconnexion : origine externe refusée", async () => {
  const { response } = await requestAs("", "/api/account", {
    method: "DELETE",
    headers: { origin: "https://evil.example" },
  });
  assert.equal(response.status, 403);
});

if (failures > 0) {
  console.error(`\n${failures} test(s) en échec.`);
  process.exit(1);
}

console.log("\nTous les tests de fumée sont passés.");
