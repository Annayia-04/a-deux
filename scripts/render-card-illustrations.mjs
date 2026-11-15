/**
 * Grave huit illustrations d'arcane, une par univers de carte.
 *
 * Le rendu est volontairement en traits d'or sur fond transparent : la carte
 * pose son propre dégradé derrière, et l'image reste nette à toutes les
 * tailles pour quelques kilo-octets.
 *
 * Usage : node scripts/render-card-illustrations.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "illustrations");

const GOLD = "url(#gold)";
const SPARKLES = [
  [318, 168, 9],
  [872, 156, 7],
  [326, 470, 6],
  [880, 472, 8],
  [600, 108, 5],
  [760, 96, 4],
  [438, 92, 4],
];

function sparkle(x, y, s) {
  const a = s * 0.28;
  return `<path d="M${x} ${y - s}L${x + a} ${y - a}L${x + s} ${y}L${x + a} ${y + a}L${x} ${y + s}L${x - a} ${y + a}L${x - s} ${y}L${x - a} ${y - a}Z" fill="${GOLD}" opacity=".32" stroke="none"/>`;
}

function ticks() {
  const parts = [];
  for (let i = 0; i < 24; i += 1) {
    const angle = (i * Math.PI * 2) / 24;
    const r1 = 216;
    const r2 = 232;
    parts.push(
      `<path d="M${(600 + Math.cos(angle) * r1).toFixed(1)} ${(330 + Math.sin(angle) * r1).toFixed(1)}L${(600 + Math.cos(angle) * r2).toFixed(1)} ${(330 + Math.sin(angle) * r2).toFixed(1)}" opacity=".26" stroke-width="1.4"/>`,
    );
  }
  return parts.join("");
}

const SYMBOLS = {
  culture: `
    <path d="M542 238c0-48 26-78 58-78s58 30 58 78-26 72-58 72-58-24-58-72Z" stroke-width="3.4"/>
    <ellipse cx="578" cy="226" rx="11" ry="7" stroke-width="2.8"/>
    <ellipse cx="622" cy="226" rx="11" ry="7" stroke-width="2.8"/>
    <path d="M584 268c10 9 22 9 32 0" stroke-width="2.8"/>
    <path d="M542 212c-20-8-34-4-44 10M658 212c20-8 34-4 44 10" stroke-width="2.6" opacity=".65"/>
    <path d="M558 196c-6-12-6-24 0-36M642 196c6-12 6-24 0-36" stroke-width="2" opacity=".4"/>
    <path d="M440 400c55-30 105-32 150-14l10 4 10-4c45-18 95-16 150 14V282c-55-30-105-32-150-14l-10 4-10-4c-45-18-95-16-150 14Z" stroke-width="4"/>
    <path d="M600 390V268" stroke-width="3"/>
    <path d="M468 304c32-12 64-12 96 0M468 334c32-12 64-12 96 0M468 364c32-12 64-12 96 0" opacity=".32" stroke-width="2"/>
    <path d="M732 304c-32-12-64-12-96 0M732 334c-32-12-64-12-96 0M732 364c-32-12-64-12-96 0" opacity=".32" stroke-width="2"/>
    <path d="M406 300c-18-30-18-62 0-92M394 236c-16-4-26-16-28-32 18 2 30 14 34 30M398 268c-16-4-26-16-28-32 18 2 30 14 34 30M404 300c-16-4-26-16-28-32 18 2 30 14 34 30" opacity=".5" stroke-width="2.2"/>
    <path d="M794 300c18-30 18-62 0-92M806 236c16-4 26-16 28-32-18 2-30 14-34 30M802 268c16-4 26-16 28-32-18 2-30 14-34 30M796 300c16-4 26-16 28-32-18 2-30 14-34 30" opacity=".5" stroke-width="2.2"/>
  `,
  gastronomie: `
    <path d="M505 250h190c0 90-42 140-95 140s-95-50-95-140Z" stroke-width="4"/>
    <path d="M520 266c24 12 136 12 160 0" opacity=".35" stroke-width="2"/>
    <path d="M600 390v66" stroke-width="4"/>
    <path d="M535 468c0 15 30 25 65 25s65-10 65-25" stroke-width="4"/>
    <path d="M574 238c-20-28 20-48 0-76M626 238c-20-28 20-48 0-76" opacity=".32" stroke-width="2.4"/>
    <g transform="translate(772 330)">
      <circle cx="0" cy="0" r="15"/><circle cx="26" cy="12" r="15"/><circle cx="-26" cy="12" r="15"/>
      <circle cx="13" cy="38" r="15"/><circle cx="-13" cy="38" r="15"/><circle cx="0" cy="64" r="15"/>
      <path d="M0-15c0-24 6-40 16-54" stroke-width="2.4"/>
      <path d="M16-54c14-6 28-2 38 8-12 10-26 12-38 4Z" fill="${GOLD}" fill-opacity=".14" stroke-width="2"/>
    </g>
    <g transform="translate(432 438)">
      <path d="M-76 0c0-45 34-78 76-78s76 33 76 78Z" stroke-width="3.6"/>
      <path d="M-40-62c0 22 0 40 0 60M0-78c0 26 0 48 0 72M40-62c0 22 0 40 0 60" opacity=".32" stroke-width="2"/>
    </g>
    <path d="M380 472h80M732 470h78" opacity=".25" stroke-width="2"/>
  `,
  nature: `
    <path d="M792 140a116 116 0 1 0 0 232 96 96 0 0 1 0-232Z" fill="${GOLD}" fill-opacity=".08" stroke-width="4"/>
    <circle cx="744" cy="212" r="10" opacity=".28"/><circle cx="760" cy="276" r="6" opacity=".24"/>
    <g transform="translate(452 360)" opacity=".85">
      <path d="M0 0L-52 90H-24L-74 180H74L24 90H52Z" stroke-width="3.4"/>
      <path d="M0 180v32" stroke-width="3"/>
    </g>
    <g transform="translate(548 318)" opacity=".95">
      <path d="M0 0L-58 102H-28L-82 206H82L28 102H58Z" stroke-width="3.8"/>
      <path d="M0 206v34" stroke-width="3.2"/>
    </g>
    <g transform="translate(652 372)" opacity=".75">
      <path d="M0 0L-46 80H-20L-64 160H64L20 80H46Z" stroke-width="3.2"/>
      <path d="M0 160v28" stroke-width="2.8"/>
    </g>
    <path d="M330 524h540" opacity=".22" stroke-width="2"/>
    <path d="M410 548c80-42 140 18 230-20s140 18 230-20" opacity=".4" stroke-width="2.6"/>
    <path d="M468 576c70-30 120 10 200-15s120 15 200-15" opacity=".2" stroke-width="2"/>
    <circle cx="410" cy="420" r="4" fill="${GOLD}" opacity=".5" stroke="none"/>
    <circle cx="852" cy="390" r="3.4" fill="${GOLD}" opacity=".45" stroke="none"/>
    <circle cx="772" cy="470" r="3" fill="${GOLD}" opacity=".35" stroke="none"/>
    <circle cx="356" cy="360" r="3" fill="${GOLD}" opacity=".35" stroke="none"/>
  `,
  aventure: `
    <path d="M330 472l122-184 122 184Z" stroke-width="3.4" opacity=".5"/>
    <path d="M560 472l152-224 152 224Z" stroke-width="3.8" opacity=".8"/>
    <path d="M742 472l70-102 70 102Z" stroke-width="3" opacity=".4"/>
    <path d="M410 372l42-76 42 76M632 348l80-124 80 124" opacity=".35" stroke-width="2"/>
    <circle cx="600" cy="310" r="94" stroke-width="3.6"/>
    <circle cx="600" cy="310" r="70" opacity=".22" stroke-width="1.5"/>
    <path d="M600 224l16 70 70 16-70 16-16 70-16-70-70-16 70-16Z" fill="${GOLD}" fill-opacity=".08" stroke-width="3"/>
    <circle cx="600" cy="310" r="11" fill="${GOLD}" fill-opacity=".18" stroke-width="2.4"/>
    <path d="M600 202v20M600 398v20M492 310h20M688 310h20" stroke-width="3"/>
    <path d="M400 540c60-34 96-12 128-54s74-38 130-26" stroke-dasharray="3 12" opacity=".4" stroke-width="2.4"/>
  `,
  creatif: `
    <path d="M486 438L702 186" stroke-width="4"/>
    <path d="M714 438L498 186" stroke-width="4"/>
    <path d="M702 186l16-34 18 10-10 36Z" fill="${GOLD}" fill-opacity=".16" stroke-width="2.4"/>
    <path d="M498 186l-16-34-18 10 10 36Z" fill="${GOLD}" fill-opacity=".16" stroke-width="2.4"/>
    <path d="M430 340c0-70 66-120 152-120 96 0 168 55 168 126 0 42-36 66-79 66h-44c-24 0-36 14-36 33 0 24-18 38-48 38-62 0-113-61-113-143Z" stroke-width="4"/>
    <circle cx="684" cy="366" r="20" stroke-width="3"/>
    <circle cx="516" cy="300" r="13" fill="${GOLD}" fill-opacity=".2" stroke-width="2.2"/>
    <circle cx="566" cy="262" r="13" fill="${GOLD}" fill-opacity=".2" stroke-width="2.2"/>
    <circle cx="626" cy="256" r="13" fill="${GOLD}" fill-opacity=".2" stroke-width="2.2"/>
    <path d="M470 470c60 22 210 22 270-4" opacity=".3" stroke-width="2"/>
  `,
  detente: `
    <rect x="504" y="300" width="82" height="164" rx="16" stroke-width="3.4"/>
    <path d="M545 300v-20" stroke-width="3"/>
    <path d="M545 280c-24-32 24-52 0-88 30 24 30 58 0 88Z" fill="${GOLD}" fill-opacity=".12" stroke-width="3"/>
    <path d="M512 332c-11 11-11 26 0 37M578 332c11 11 11 26 0 37" opacity=".3" stroke-width="2"/>
    <path d="M640 352h104v40c0 31-23 54-52 54s-52-23-52-54Z" stroke-width="3.4"/>
    <path d="M744 364h18c17 0 28 13 28 28s-11 28-28 28h-18" stroke-width="3"/>
    <path d="M664 340c-15-24 15-40 0-68M702 340c-15-24 15-40 0-68" opacity=".28" stroke-width="2.2"/>
    <rect x="424" y="464" width="360" height="88" rx="42" stroke-width="3" opacity=".5"/>
    <path d="M466 464c38 22 234 22 272 0" opacity=".28" stroke-width="2"/>
    <path d="M442 520c50 18 260 18 316 0" opacity=".2" stroke-width="2"/>
  `,
  sport: `
    ${Array.from({ length: 22 }, (_, i) => {
      const angle = (-Math.PI * 0.86) + (i * Math.PI * 1.72) / 21;
      const x = 600 + Math.cos(angle) * 182;
      const y = 320 + Math.sin(angle) * 182;
      const deg = (angle * 180) / Math.PI + 90;
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="17" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" opacity=".42" stroke-width="2"/>`;
    }).join("")}
    <circle cx="600" cy="320" r="84" stroke-width="4.2"/>
    <path d="M600 236c34 26 34 142 0 168M528 276c70 30 70 60 0 88M672 276c-70 30-70 60 0 88" opacity=".45" stroke-width="2.6"/>
    <path d="M548 320h104" opacity=".25" stroke-width="2"/>
    <path d="M372 244c-34 44-34 108 0 152M828 244c34 44 34 108 0 152" opacity=".26" stroke-width="2.6"/>
    <path d="M430 540h340" opacity=".25" stroke-width="2"/>
  `,
  nocturne: `
    <circle cx="600" cy="292" r="112" stroke-width="4.2"/>
    <path d="M668 204a104 104 0 0 1 0 176 88 88 0 0 0 0-176Z" fill="${GOLD}" fill-opacity=".07" stroke-width="2.6"/>
    <circle cx="560" cy="262" r="16" opacity=".4"/>
    <circle cx="642" cy="322" r="22" opacity=".34"/>
    <circle cx="612" cy="232" r="9" opacity=".4"/>
    <path d="M330 500h540" opacity=".26" stroke-width="2"/>
    <path d="M356 500v-78h82v78M438 500v-132l62-42 62 42v132M562 500v-98h86v98M648 500v-72h82v72M730 500v-112h72v112" stroke-width="3" opacity=".78"/>
    <path d="M470 368l30-22 30 22" stroke-width="2.6" opacity=".6"/>
    <rect x="592" y="432" width="24" height="32" opacity=".45" stroke-width="2"/>
    <rect x="678" y="448" width="22" height="28" opacity=".4" stroke-width="2"/>
    <path d="M400 420h40v56h-40z" stroke-width="2.6" opacity=".65"/>
    <path d="M406 420v-12h28v12" stroke-width="2.4" opacity=".5"/>
    <circle cx="420" cy="450" r="6" fill="${GOLD}" fill-opacity=".25" stroke="none"/>
    <path d="M756 190c8-8 16-8 24 0M788 214c8-8 16-8 24 0M736 240c8-8 16-8 24 0" stroke-width="2.4" opacity=".6"/>
  `,
};

function frame(symbol) {
  // Traits légèrement plus appuyés : la gravure reste lisible sur le dégradé.
  const bold = symbol.replace(
    /stroke-width="([\d.]+)"/g,
    (_, width) => `stroke-width="${(Number(width) * 1.22).toFixed(2)}"`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 640" role="presentation">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f2d79e"/>
      <stop offset=".55" stop-color="#d9b46b"/>
      <stop offset="1" stop-color="#a97c3f"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="48%" r="58%">
      <stop offset="0" stop-color="#d9b46b" stop-opacity=".16"/>
      <stop offset=".6" stop-color="#d9b46b" stop-opacity=".04"/>
      <stop offset="1" stop-color="#d9b46b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="640" fill="url(#glow)"/>
  <g fill="none" stroke="url(#gold)" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="600" cy="330" r="232" opacity=".3" stroke-width="1.6"/>
    <circle cx="600" cy="330" r="216" opacity=".18" stroke-width="1" stroke-dasharray="1 12"/>
    ${ticks()}
    ${SPARKLES.map(([x, y, s]) => sparkle(x, y, s)).join("")}
    ${bold}
    <path d="M470 574h260" opacity=".3" stroke-width="1.8"/>
    <path d="M600 566l9 8-9 8-9-8Z" opacity=".45" stroke-width="1.6"/>
  </g>
</svg>
`;
}

await mkdir(OUT, { recursive: true });

for (const [id, symbol] of Object.entries(SYMBOLS)) {
  const file = path.join(OUT, `${id}.svg`);
  await writeFile(file, frame(symbol), "utf8");
  console.log(`✓ ${id}.svg`);
}
