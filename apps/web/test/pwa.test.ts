import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DIST, pngSize, readDist, requireDist } from './dist.js';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface Manifest {
  [key: string]: unknown;
  icons: ManifestIcon[];
  shortcuts: { name: string; url: string; icons?: ManifestIcon[] }[];
}

beforeAll(() => {
  requireDist();
});

describe('manifest PWA', () => {
  const manifest = () => JSON.parse(readDist('manifest.webmanifest')) as Manifest;

  it('contient tous les champs requis', () => {
    const m = manifest();
    expect(m).toMatchObject({
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'fr',
    });
    for (const key of ['name', 'short_name', 'description', 'background_color', 'theme_color']) {
      expect(m[key], key).toBeTypeOf('string');
    }
    expect(String(m.short_name).length).toBeLessThanOrEqual(12);
    expect(m.categories).toEqual(expect.arrayContaining(['entertainment']));
    // Pas de flash au lancement : écran de démarrage et thème identiques au fond de l'appli.
    expect(m.background_color).toBe('#0E0B10');
  });

  it.each([
    ['any', 192],
    ['any', 512],
    ['maskable', 192],
    ['maskable', 512],
  ])('déclare une icône %s %ipx présente à la bonne taille', (purpose, size) => {
    const icon = manifest().icons.find(
      (i) => i.purpose === purpose && i.sizes === `${size}x${size}`,
    );
    expect(icon, `${purpose} ${size}`).toBeDefined();
    const file = join(DIST, icon!.src);
    expect(existsSync(file)).toBe(true);
    expect(pngSize(file)).toEqual({ width: size, height: size });
  });

  it('propose les raccourcis « Reprendre » et « Mes parties »', () => {
    const shortcuts = manifest().shortcuts;
    expect(shortcuts.map((s) => s.name)).toEqual(['Reprendre', 'Mes parties']);
    expect(shortcuts[0]?.url).toBe('/?reprendre=1');
    expect(shortcuts[1]?.url).toBe('/parties');
    for (const s of shortcuts) {
      for (const icon of s.icons ?? []) expect(existsSync(join(DIST, icon.src))).toBe(true);
    }
  });
});

describe('index.html', () => {
  const html = () => readDist('index.html');

  it('déclare les balises iOS et le viewport plein écran', () => {
    const h = html();
    expect(h).toContain('viewport-fit=cover');
    expect(h).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(h).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(h).toContain('name="apple-mobile-web-app-title" content="JoJo Tracker"');
    expect(h).toContain('rel="manifest"');
    expect(h).toMatch(/<html lang="fr">/);
  });

  it('référence une apple-touch-icon 180 px et un favicon SVG existants', () => {
    const h = html();
    expect(h).toContain('href="/icons/apple-touch-icon.png"');
    expect(pngSize(join(DIST, 'icons/apple-touch-icon.png'))).toEqual({ width: 180, height: 180 });
    expect(h).toContain('href="/favicon.svg"');
    expect(existsSync(join(DIST, 'favicon.svg'))).toBe(true);
  });

  it('déclare des écrans de démarrage iOS existants aux bonnes dimensions', () => {
    const links = [
      ...html().matchAll(/<link rel="apple-touch-startup-image" href="([^"]+)" media="([^"]+)"/g),
    ];
    expect(links.length).toBeGreaterThanOrEqual(8);
    for (const [, href, media] of links) {
      const w = Number(/device-width: (\d+)px/.exec(media!)?.[1]);
      const h = Number(/device-height: (\d+)px/.exec(media!)?.[1]);
      const ratio = Number(/pixel-ratio: (\d+)/.exec(media!)?.[1]);
      expect(pngSize(join(DIST, href!))).toEqual({ width: w * ratio, height: h * ratio });
    }
  });

  it("n'utilise aucun script ni style inline (CSP stricte)", () => {
    const h = html();
    expect(h).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(h).not.toMatch(/<style/);
    expect(h).not.toMatch(/\sstyle="/);
    expect(h).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});

describe('service worker', () => {
  const sw = () => readDist('sw.js');

  it("précache l'app shell, les assets et les polices", () => {
    const s = sw();
    expect(s).toContain('"index.html"');
    expect(s).toMatch(/assets\/index-[\w-]+\.js/);
    expect(s).toMatch(/assets\/index-[\w-]+\.css/);
    expect(s).toMatch(/\.woff2"/);
    expect(s).toContain('icons/icon-192.png');
  });

  it('ne met jamais en cache les réponses /api (NetworkOnly) et les exclut du fallback', () => {
    const s = sw();
    expect(s).toMatch(
      /startsWith\("\/api\/"\)[^;]*NetworkOnly|NetworkOnly[^;]*startsWith\("\/api\/"\)/s,
    );
    expect(s).toContain('NavigationRoute');
    expect(s).toMatch(/denylist:\[\/\^\\\/api/);
    expect(s).not.toMatch(/"url":"\/?api\//);
  });

  it('attend une action de l’utilisateur pour se mettre à jour (pas de skipWaiting automatique)', () => {
    expect(sw()).not.toMatch(/self\.skipWaiting\(\)(?!\s*\})/);
  });
});
