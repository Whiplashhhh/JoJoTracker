// Captures de chaque écran et état clé, en 375×812 (mobile) puis 1280×800 (desktop).
// Usage : BASE_URL=http://localhost:3000 OUT_DIR=../../docs/screenshots node scripts/screenshots.mjs
// Optionnel : PLAYWRIGHT_CHROMIUM_EXECUTABLE=/chemin/vers/chromium
import { mkdir } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.OUT_DIR ?? 'screenshots';
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ['--no-sandbox', '--font-render-hinting=none'],
});

const VIEWPORTS = {
  mobile: {
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(page, method, path, body) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.status;
    },
    { method, path, body },
  );
}

async function shot(page, name, kind, opts = {}) {
  if (ONLY && !ONLY.has(name)) return;
  await sleep(opts.wait ?? 700);
  await page.screenshot({ path: `${OUT}/${kind}-${name}.png`, fullPage: opts.fullPage ?? false });
  console.log(`✓ ${kind}-${name}`);
}

async function run(kind) {
  const context = await browser.newContext({
    ...VIEWPORTS[kind],
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const user = `Erina_${kind}_${Date.now().toString(36).slice(-4)}`;

  // 1. Connexion / inscription
  await page.goto(`${BASE}/connexion`);
  await shot(page, 'connexion', kind, { wait: 1200 });
  await page.getByRole('tab', { name: 'Inscription' }).click();
  await page.getByLabel('Pseudo').fill(user);
  await page.getByLabel('Mot de passe', { exact: true }).fill('ora-ora-ora-42!');
  await shot(page, 'inscription', kind);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL(`${BASE}/`);

  // 2. Accueil vide
  await shot(page, 'accueil-vide', kind, { wait: 1200 });
  await shot(page, 'accueil-vide-complet', kind, { fullPage: true });

  // 3. Progression : partie 1 terminée, partie 2 entamée, partie 3 commencée
  const ids = [
    ...Array.from({ length: 9 }, (_, i) => `p1-e${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `p2-e${i + 1}`),
    'p3-e1',
    'p3-e2',
  ];
  await api(page, 'PUT', '/api/watched', {
    watched: true,
    items: ids.map((episodeId) => ({ episodeId })),
  });
  await page.reload();
  await shot(page, 'accueil-en-cours', kind, { wait: 1200 });
  await shot(page, 'accueil-en-cours-complet', kind, { fullPage: true });

  // 4. Parties
  await page.goto(`${BASE}/parties`);
  await shot(page, 'parties', kind, { wait: 1000 });

  // 5. Partie en cours (2)
  await page.goto(`${BASE}/parties/2`);
  await shot(page, 'partie-en-cours', kind, { wait: 1200 });
  await page.evaluate(() => window.scrollBy(0, 700));
  await shot(page, 'partie-en-cours-defile', kind);

  // 6. Bottom sheet « épisodes précédents » : on coche l'épisode 10 de la partie 2
  await page.locator('[data-episode="p2-e10"] .seal').scrollIntoViewIfNeeded();
  await page.locator('[data-episode="p2-e10"] .seal').click();
  await shot(page, 'bottom-sheet-precedents', kind);
  await page.getByRole('button', { name: 'Seulement celui-ci' }).click();
  await shot(page, 'cochage-revelation', kind, { wait: 500 });

  // 7. Révélation volontaire
  await page.locator('[data-episode="p2-e12"] .censor').click();
  await shot(page, 'revelation-confirmation', kind);
  await page.getByRole('button', { name: 'Non, garder la surprise' }).click();

  // 8. Partie terminée + célébration : partie 2 entière
  await api(page, 'PUT', '/api/watched', {
    watched: true,
    items: Array.from({ length: 16 }, (_, i) => ({ episodeId: `p2-e${i + 1}` })),
  });
  await page.reload();
  await page.locator('[data-episode="p2-e17"] .seal').scrollIntoViewIfNeeded();
  await page.locator('[data-episode="p2-e17"] .seal').click();
  await shot(page, 'celebration', kind, { wait: 2200 });
  await page.getByRole('button', { name: 'Toucher pour continuer' }).click();
  await page.goto(`${BASE}/parties/1`);
  await shot(page, 'partie-terminee', kind, { wait: 1200 });

  // 9. Partie 7 (épisodes à venir) et autres palettes
  for (const n of [3, 4, 5, 6, 7]) {
    await page.goto(`${BASE}/parties/${n}`);
    await shot(page, `partie-${n}`, kind, { wait: 1000 });
  }
  await page.goto(`${BASE}/parties/7`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await shot(page, 'partie-7-a-venir', kind);

  // 10. Profil
  await page.goto(`${BASE}/profil`);
  await shot(page, 'profil', kind, { wait: 1000 });
  await shot(page, 'profil-complet', kind, { fullPage: true });

  // 11. Hors ligne
  await context.setOffline(true);
  await page.goto(`${BASE}/`).catch(() => undefined);
  await shot(page, 'hors-ligne', kind, { wait: 1500 });
  await context.setOffline(false);
  await context.close();
}

async function runInstallPrompts() {
  // iOS Safari (hors standalone) : bannière + fiche illustrée
  const ios = await browser.newContext({
    ...devices['iPhone 13 Mini'],
    viewport: { width: 375, height: 812 },
    locale: 'fr-FR',
  });
  const page = await ios.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('jojo.visits', '3');
  });
  await page.goto(`${BASE}/connexion`);
  const user = `Lisa_${Date.now().toString(36).slice(-4)}`;
  await page.getByRole('tab', { name: 'Inscription' }).click();
  await page.getByLabel('Pseudo').fill(user);
  await page.getByLabel('Mot de passe', { exact: true }).fill('ora-ora-ora-42!');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.getByRole('complementary', { name: 'Installer l’appli' }).scrollIntoViewIfNeeded();
  await shot(page, 'installation-banniere-ios', 'mobile');
  await page.getByRole('button', { name: 'Installer', exact: true }).click();
  await shot(page, 'installation-fiche-ios', 'mobile');
  await ios.close();

  // Mode standalone (appli installée) : aucune invitation, barre de statut intégrée
  const standalone = await browser.newContext({
    ...devices['iPhone 13 Mini'],
    viewport: { width: 375, height: 812 },
    locale: 'fr-FR',
  });
  const p2 = await standalone.newPage();
  await p2.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    localStorage.setItem('jojo.visits', '5');
  });
  await p2.goto(`${BASE}/connexion`);
  await p2.getByRole('tab', { name: 'Inscription' }).click();
  await p2.getByLabel('Pseudo').fill(`Suzi_${Date.now().toString(36).slice(-4)}`);
  await p2.getByLabel('Mot de passe', { exact: true }).fill('ora-ora-ora-42!');
  await p2.getByRole('button', { name: 'Créer mon compte' }).click();
  await p2.waitForURL(`${BASE}/`);
  await shot(p2, 'standalone-accueil', 'mobile', { wait: 1200 });
  await standalone.close();
}

const which = process.env.KINDS ? process.env.KINDS.split(',') : ['mobile', 'desktop'];
for (const kind of which) await run(kind);
if (!process.env.SKIP_INSTALL) await runInstallPrompts();
await browser.close();
