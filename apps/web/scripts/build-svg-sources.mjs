// Construit les SVG sources des icônes et écrans de démarrage (versionnés dans assets-src/).
// Les glyphes sont convertis en tracés vectoriels (aucune police requise au rendu).
// Polices : Dela Gothic One et Anton (SIL Open Font License).
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);
const load = (spec) => {
  const buf = readFileSync(require.resolve(spec));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const dela = load('@fontsource/dela-gothic-one/files/dela-gothic-one-japanese-400-normal.woff');
const anton = load('@fontsource/anton/files/anton-latin-400-normal.woff');

export const COLORS = {
  ink: '#0E0B10',
  paper: '#F3EAD3',
  magenta: '#FF1F8E',
  yellow: '#FFE600',
};

/** Tracé d'un texte centré sur (cx, cy) à la taille donnée. */
function centeredPath(font, text, size, cx, cy) {
  const probe = font.getPath(text, 0, 0, size);
  const box = probe.getBoundingBox();
  const x = cx - (box.x1 + box.x2) / 2;
  const y = cy - (box.y1 + box.y2) / 2;
  return font.getPath(text, x, y, size).toPathData(2);
}

function speedLines(cx, cy, r, count, color, opacity) {
  const wedges = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const w = (Math.PI * 2) / count / 3;
    const p = (ang) =>
      `${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`;
    wedges.push(`M${cx},${cy} L${p(a - w / 2)} L${p(a + w / 2)} Z`);
  }
  return `<path d="${wedges.join(' ')}" fill="${color}" opacity="${opacity}"/>`;
}

const halftonePattern = (id, color, size = 14, r = 3) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}"/></pattern>`;

/**
 * Emblème : « ゴ » jaune cerné d'encre avec ombre portée dure, dans une case de manga.
 * @param {number} scale taille du glyphe
 */
function emblem({ cx, cy, size, stroke }) {
  const glyph = centeredPath(dela, 'ゴ', size, cx, cy);
  const shadow = centeredPath(dela, 'ゴ', size, cx + size * 0.05, cy + size * 0.05);
  return `
  <g transform="rotate(-8 ${cx} ${cy})">
    <path d="${shadow}" fill="${COLORS.ink}" stroke="${COLORS.ink}" stroke-width="${stroke}" stroke-linejoin="round"/>
    <path d="${glyph}" fill="${COLORS.yellow}" stroke="${COLORS.ink}" stroke-width="${stroke}" stroke-linejoin="round" paint-order="stroke"/>
  </g>`;
}

function icon({ maskable }) {
  const S = 512;
  const c = S / 2;
  const glyphSize = maskable ? 250 : 330;
  const frame = maskable
    ? ''
    : `<rect x="26" y="26" width="${S - 52}" height="${S - 52}" fill="none" stroke="${COLORS.ink}" stroke-width="16"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>${halftonePattern('dots', COLORS.ink, 16, 3.2)}
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
    <mask id="fadeMask"><rect width="${S}" height="${S}" fill="url(#fade)"/></mask>
  </defs>
  <rect width="${S}" height="${S}" fill="${COLORS.magenta}"/>
  ${speedLines(c, c, S, 36, COLORS.paper, 0.22)}
  <rect width="${S}" height="${S}" fill="url(#dots)" opacity="0.28" mask="url(#fadeMask)"/>
  ${emblem({ cx: c, cy: c + 6, size: glyphSize, stroke: maskable ? 14 : 18 })}
  ${frame}
</svg>
`;
}

function favicon() {
  const S = 64;
  const glyph = centeredPath(dela, 'ゴ', 46, 32, 33);
  const shadow = centeredPath(dela, 'ゴ', 46, 34.5, 35.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
  <rect x="2" y="2" width="60" height="60" rx="10" fill="${COLORS.magenta}" stroke="${COLORS.ink}" stroke-width="4"/>
  <g transform="rotate(-8 32 32)">
    <path d="${shadow}" fill="${COLORS.ink}"/>
    <path d="${glyph}" fill="${COLORS.yellow}" stroke="${COLORS.ink}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/>
  </g>
</svg>
`;
}

/** Écran de démarrage iOS, dessiné sur une grille 1000 × 2000 puis recadré au format de l'appareil. */
function splash() {
  const W = 1000;
  const H = 2000;
  const cx = W / 2;
  const cy = H * 0.44;
  const panel = 420;
  const title = centeredPath(anton, 'JOJO TRACKER', 120, cx, cy + panel / 2 + 170);
  const gogo = centeredPath(dela, 'ゴゴゴゴ', 70, cx, cy + panel / 2 + 320);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
  <defs>${halftonePattern('dots', COLORS.magenta, 18, 3)}</defs>
  <rect width="${W}" height="${H}" fill="${COLORS.ink}"/>
  ${speedLines(cx, cy, H, 60, COLORS.paper, 0.05)}
  <rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.14"/>
  <g transform="rotate(-6 ${cx} ${cy})">
    <rect x="${cx - panel / 2 + 18}" y="${cy - panel / 2 + 18}" width="${panel}" height="${panel}" fill="${COLORS.yellow}"/>
    <rect x="${cx - panel / 2}" y="${cy - panel / 2}" width="${panel}" height="${panel}" fill="${COLORS.magenta}" stroke="${COLORS.paper}" stroke-width="12"/>
  </g>
  ${emblem({ cx, cy: cy + 6, size: 280, stroke: 16 })}
  <path d="${title}" fill="${COLORS.paper}"/>
  <path d="${gogo}" fill="${COLORS.magenta}" opacity="0.9"/>
</svg>
`;
}

const out = (name) => new URL(`../assets-src/${name}`, import.meta.url);
await writeFile(out('icon.svg'), icon({ maskable: false }));
await writeFile(out('icon-maskable.svg'), icon({ maskable: true }));
await writeFile(out('favicon.svg'), favicon());
await writeFile(out('splash.svg'), splash());
console.log('SVG sources écrits dans assets-src/');
