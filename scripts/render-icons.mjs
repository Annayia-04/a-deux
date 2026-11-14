import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Rend les icônes PWA depuis `public/icons/icon.svg`.
 * Usage : `node scripts/render-icons.mjs`
 */
const root = process.cwd();
const source = path.join(root, "public", "icons", "icon.svg");
const outputDir = path.join(root, "public", "icons");

/** `maskable` : la zone utile est le disque central (safe zone 80 %). */
const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-1024.png", size: 1024 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "maskable-512.png", size: 512, padding: 0.12 },
];

const svg = await readFile(source);
await mkdir(outputDir, { recursive: true });

for (const target of targets) {
  const padding = target.padding ?? 0;
  const inner = Math.round(target.size * (1 - padding * 2));
  const image = await sharp(svg, { density: 384 })
    .resize(inner, inner)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: target.size,
      height: target.size,
      channels: 4,
      background: { r: 10, g: 9, b: 12, alpha: 1 },
    },
  })
    .composite([{ input: image, gravity: "center" }])
    .png()
    .toFile(path.join(outputDir, target.name));

  console.log(`✓ ${target.name}`);
}
