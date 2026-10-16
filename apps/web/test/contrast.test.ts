import { describe, expect, it } from 'vitest';
import { HOME_PALETTE, INK, PART_PALETTES, type Palette } from '../src/theme/palettes.js';

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const palettes: [string, Palette][] = [
  ['accueil', HOME_PALETTE],
  ...Object.entries(PART_PALETTES).map(([k, p]) => [`partie ${k}`, p] as [string, Palette]),
];

describe('contrastes WCAG AA des palettes', () => {
  it.each(palettes)('%s', (_name, p) => {
    expect(contrast(p.bgInk, p.bg), 'texte sur fond').toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, p.paper), 'encre sur papier').toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accentInk, p.accent), 'texte sur accent').toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accent, INK), 'accent sur encre').toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accent2, INK), 'accent secondaire sur encre').toBeGreaterThanOrEqual(3);
    // Les cases (bordure encre) doivent se détacher du fond (composant non textuel, ≥ 3:1)…
    // …sauf sur les fonds sombres où c'est le papier qui fait la séparation.
    expect(
      Math.max(contrast(INK, p.bg), contrast(p.paper, p.bg)),
      'case vs fond',
    ).toBeGreaterThanOrEqual(3);
  });
});
