/**
 * Palettes de l'appli : une pour l'accueil, une par Partie.
 * Rendu unique (pas de bascule clair/sombre) : chaque palette est un « numéro » de manga
 * avec ses propres contrastes, vérifiés WCAG AA par test (test/contrast.test.ts).
 */
export interface Palette {
  /** Fond d'écran. */
  bg: string;
  /** Texte posé directement sur le fond (≥ 4,5:1). */
  bgInk: string;
  /** Couleur d'accent (≥ 4,5:1 sur l'encre). */
  accent: string;
  /** Texte posé sur l'accent (≥ 4,5:1). */
  accentInk: string;
  /** Accent secondaire (décoratif, ≥ 3:1 sur l'encre). */
  accent2: string;
  /** Papier des cases (encre ≥ 4,5:1). */
  paper: string;
  /** Points de trame (décoratif). */
  dot: string;
}

export const INK = '#0E0B10';

export const HOME_PALETTE: Palette = {
  bg: INK,
  bgInk: '#F3EAD3',
  accent: '#FF2E93',
  accentInk: INK,
  accent2: '#FFE600',
  paper: '#F3EAD3',
  dot: '#FF2E93',
};

export const PART_PALETTES: Readonly<Record<number, Palette>> = {
  // Phantom Blood — victorien : sépia, bordeaux, or vieilli.
  1: {
    bg: '#4A1520',
    bgInk: '#F1E2C2',
    accent: '#D9AC52',
    accentInk: '#2A0D12',
    accent2: '#B98458',
    paper: '#EFE0BF',
    dot: '#7A2A35',
  },
  // Battle Tendency — orange brûlé, turquoise, sable.
  2: {
    bg: '#0B5F63',
    bgInk: '#FBEFD5',
    accent: '#F27E33',
    accentInk: '#1D0D04',
    accent2: '#E9C98E',
    paper: '#F5E6C4',
    dot: '#13898E',
  },
  // Stardust Crusaders — bleu nuit, émeraude, or du désert.
  3: {
    bg: '#0F1B3D',
    bgInk: '#F4E9CF',
    accent: '#E8B54A',
    accentInk: '#1A1204',
    accent2: '#2BB38A',
    paper: '#F1E6CB',
    dot: '#24407A',
  },
  // Diamond is Unbreakable — pastels pop : rose, menthe, lilas, jaune.
  4: {
    bg: '#F9B8D3',
    bgInk: '#2B1036',
    accent: '#8EE6CB',
    accentInk: INK,
    accent2: '#C3A8F5',
    paper: '#FFF6D9',
    dot: '#F07DB0',
  },
  // Golden Wind — violet profond, or, touches de rouge.
  5: {
    bg: '#2A0E4D',
    bgInk: '#F7E9C8',
    accent: '#F4C534',
    accentInk: '#1E0B33',
    accent2: '#F0505A',
    paper: '#F4E8CC',
    dot: '#4B1F80',
  },
  // Stone Ocean — aigue-marine, gris béton, vert électrique.
  6: {
    bg: '#2F3A3D',
    bgInk: '#E9F4F1',
    accent: '#3DF58A',
    accentInk: '#04210F',
    accent2: '#6FD6C9',
    paper: '#E6ECEA',
    dot: '#4A585C',
  },
  // Steel Ball Run — ocre western, bleu ciel délavé, brun cuir.
  7: {
    bg: '#C8873A',
    bgInk: '#1F1108',
    accent: '#9CCBE6',
    accentInk: '#0E1B26',
    accent2: '#B0713F',
    paper: '#F4E7CF',
    dot: '#A86A28',
  },
};

export function paletteFor(partNumber?: number): Palette {
  if (partNumber === undefined) return HOME_PALETTE;
  const keys = Object.keys(PART_PALETTES).length;
  return PART_PALETTES[((partNumber - 1) % keys) + 1] ?? HOME_PALETTE;
}

/** Variables CSS à poser sur un conteneur pour lui appliquer une palette. */
export function paletteVars(p: Palette): Record<string, string> {
  return {
    '--th-bg': p.bg,
    '--th-bg-ink': p.bgInk,
    '--th-accent': p.accent,
    '--th-accent-ink': p.accentInk,
    '--th-accent-2': p.accent2,
    '--th-paper': p.paper,
    '--th-dot': p.dot,
  };
}
