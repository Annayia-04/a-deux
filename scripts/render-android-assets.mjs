import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Régénère les icônes et l'écran de démarrage Android depuis
 * `public/icons/icon.svg`.
 * Usage : `node scripts/render-android-assets.mjs`
 */
const root = process.cwd();
const res = path.join(root, "android", "app", "src", "main", "res");
const source = await readFile(path.join(root, "public", "icons", "icon.svg"));

const HEART =
  "M256 380S136 314 136 234c0-42 32-72 70-72 25 0 47 14 62 36 15-22 37-36 62-36 38 0 70 30 70 72 0 80-120 146-120 146Z";

const INK = "#0a090c";
const GOLD = "#c5a059";

const legacySvg = (size) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="104" fill="${INK}" />
    <rect x="34" y="34" width="444" height="444" rx="104" fill="none" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="2" />
    <path d="${HEART}" fill="#9e192d" stroke="${GOLD}" stroke-width="4" stroke-linejoin="round" />
  </svg>`,
);

const foregroundSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
    <path d="${HEART}" transform="translate(22 22) scale(0.125)" fill="#9e192d" stroke="${GOLD}" stroke-width="8" stroke-linejoin="round" />
  </svg>`,
);

const splashSvg = (width, height) => {
  const scale = Math.min(width, height) * 0.0011;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${INK}" />
      <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.55}" fill="#7a1120" fill-opacity="0.22" />
      <g transform="translate(${width / 2} ${height / 2}) scale(${scale}) translate(-256 -256)">
        <path d="${HEART}" fill="#9e192d" stroke="${GOLD}" stroke-width="4" stroke-linejoin="round" />
      </g>
    </svg>`,
  );
};

const densities = [
  { dir: "mdpi", legacy: 48, foreground: 108 },
  { dir: "hdpi", legacy: 72, foreground: 162 },
  { dir: "xhdpi", legacy: 96, foreground: 216 },
  { dir: "xxhdpi", legacy: 144, foreground: 324 },
  { dir: "xxxhdpi", legacy: 192, foreground: 432 },
];

for (const { dir, legacy, foreground } of densities) {
  const dirPath = path.join(res, `mipmap-${dir}`);
  await mkdir(dirPath, { recursive: true });

  const rounded = await sharp(legacySvg(legacy), { density: 384 })
    .resize(legacy, legacy)
    .png()
    .toBuffer();

  await sharp(rounded).png().toFile(path.join(dirPath, "ic_launcher.png"));

  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${legacy}" height="${legacy}">
      <circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}" fill="#fff" />
    </svg>`,
  );
  const round = await sharp(rounded)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp(round).png().toFile(path.join(dirPath, "ic_launcher_round.png"));

  await sharp(foregroundSvg, { density: 384 })
    .resize(foreground, foreground)
    .png()
    .toFile(path.join(dirPath, "ic_launcher_foreground.png"));

  console.log(`✓ mipmap-${dir}`);
}

// Écrans de démarrage : tailles standard Capacitor, rendues au pixel près.
const splashTargets = [
  { dir: "drawable", width: 480, height: 320 },
  { dir: "drawable-land-mdpi", width: 480, height: 320 },
  { dir: "drawable-land-hdpi", width: 800, height: 480 },
  { dir: "drawable-land-xhdpi", width: 1280, height: 720 },
  { dir: "drawable-land-xxhdpi", width: 1600, height: 960 },
  { dir: "drawable-land-xxxhdpi", width: 1920, height: 1280 },
  { dir: "drawable-port-mdpi", width: 320, height: 480 },
  { dir: "drawable-port-hdpi", width: 480, height: 800 },
  { dir: "drawable-port-xhdpi", width: 720, height: 1280 },
  { dir: "drawable-port-xxhdpi", width: 960, height: 1600 },
  { dir: "drawable-port-xxxhdpi", width: 1280, height: 1920 },
];

for (const { dir, width, height } of splashTargets) {
  const dirPath = path.join(res, dir);
  await mkdir(dirPath, { recursive: true });
  await sharp(splashSvg(width, height))
    .resize(width, height)
    .png()
    .toFile(path.join(dirPath, "splash.png"));
  console.log(`✓ ${dir}/splash.png`);
}
