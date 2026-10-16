// Génère toutes les icônes PWA et écrans de démarrage iOS depuis les SVG de assets-src/.
// Usage : pnpm --filter @jojo/web icons   (reconstruit d'abord les SVG sources)
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const src = (name) => new URL(`../assets-src/${name}`, import.meta.url);
const pub = (name) => new URL(`../public/${name}`, import.meta.url);

await mkdir(pub('icons'), { recursive: true });
await mkdir(pub('splash'), { recursive: true });

const icon = await readFile(src('icon.svg'));
const maskable = await readFile(src('icon-maskable.svg'));
const splash = await readFile(src('splash.svg'));

const png = (svg, size) =>
  sharp(svg, { density: Math.max(72, Math.ceil((72 * size) / 512) * 2) })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: false });

const jobs = [
  [icon, 192, 'icons/icon-192.png'],
  [icon, 512, 'icons/icon-512.png'],
  [maskable, 192, 'icons/maskable-192.png'],
  [maskable, 512, 'icons/maskable-512.png'],
  [maskable, 180, 'icons/apple-touch-icon.png'],
  [icon, 96, 'icons/shortcut-96.png'],
  [icon, 32, 'icons/favicon-32.png'],
];
for (const [svg, size, name] of jobs) {
  await png(svg, size).toFile(pub(name).pathname);
}
await copyFile(src('favicon.svg'), pub('favicon.svg'));

const screens = JSON.parse(await readFile(src('splash-screens.json'), 'utf8'));
for (const s of screens) {
  const w = s.width * s.ratio;
  const h = s.height * s.ratio;
  await sharp(splash, { density: 220 })
    .resize(w, h, { fit: 'cover' })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(pub(`splash/apple-splash-${w}x${h}.png`).pathname);
}
console.log(`Icônes et ${screens.length} écrans de démarrage générés dans public/`);
