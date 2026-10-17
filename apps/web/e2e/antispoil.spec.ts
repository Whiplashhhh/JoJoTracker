import { expect, test } from '@playwright/test';
import { catalog, row, signUp, titleOf } from './helpers';

const publicNames = new Set(
  catalog.parts
    .flatMap((p) => [p.name, ...p.seasons.map((s) => s.name)])
    .map((n) => n.toLowerCase()),
);
const allTitles = catalog.episodes.flatMap((e) =>
  [e.titleFr, e.titleEn]
    .filter((t): t is string => t !== null && !publicNames.has(t.toLowerCase()))
    .map((title) => ({ id: e.id, title })),
);

test('aucun titre non vu dans le DOM, les attributs, le titre de page ni la console', async ({
  page,
}) => {
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(msg.text()));
  await signUp(page);
  await page.goto('/parties/3');
  await row(page, 'p3-e1')
    .getByRole('button', { name: /comme vu/ })
    .click();
  // 26 épisodes des parties 1 et 2 ne sont pas vus : on ne coche que celui-ci.
  await page.getByRole('button', { name: 'Seulement celui-ci' }).click();
  await expect(row(page, 'p3-e1')).toContainText(titleOf('p3-e1'));

  for (const path of ['/', '/parties', '/parties/3', '/parties/5', '/profil']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    const title = await page.title();
    const leaks = allTitles
      .filter((t) => t.id !== 'p3-e1')
      .filter((t) => html.includes(t.title) || title.includes(t.title));
    expect(leaks, path).toEqual([]);
  }
  const consoleLeaks = allTitles.filter((t) => logs.some((l) => l.includes(t.title)));
  expect(consoleLeaks).toEqual([]);
});

test('révélation volontaire : confirmation puis titre affiché pour la session seulement', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/parties/4');
  const target = row(page, 'p4-e10');
  await target.getByRole('button', { name: /Révéler le titre de l’épisode 10/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Révéler le titre ?' });
  await expect(dialog).toContainText('Ça peut spoiler');
  await dialog.getByRole('button', { name: 'Révéler quand même' }).click();
  await expect(target).toContainText(titleOf('p4-e10'));
  await expect(row(page, 'p4-e11')).not.toContainText(titleOf('p4-e11'));
  // Rechargement : rien n'a été persisté.
  await page.reload();
  await expect(row(page, 'p4-e10').locator('.censor')).toBeVisible();
  await expect(row(page, 'p4-e10')).not.toContainText(titleOf('p4-e10'));
});

test.describe('caches côté navigateur', () => {
  // Sans service worker, pour pouvoir ralentir les réponses /api avec page.route.
  test.use({ serviceWorkers: 'block' });

  test('réactiver l’anti-spoil n’affiche jamais les anciens titres, même si le serveur tarde', async ({
    page,
  }) => {
    await signUp(page);
    await page.goto('/profil');
    await page.getByRole('switch', { name: 'Mode anti-spoil' }).click();
    await expect(page.getByRole('switch', { name: 'Mode anti-spoil' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await page.getByRole('link', { name: 'Parties' }).click();
    await page.getByRole('link', { name: /^Partie 4 :/ }).click();
    await expect(row(page, 'p4-e10')).toContainText(titleOf('p4-e10'));

    await page.getByRole('link', { name: 'Profil' }).click();
    await page.getByRole('switch', { name: 'Mode anti-spoil' }).click();
    await expect(page.getByRole('switch', { name: 'Mode anti-spoil' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await page.route('**/api/catalog', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await page.getByRole('link', { name: 'Parties' }).click();
    // Pendant toute l'attente : aucun titre dans la page.
    for (let i = 0; i < 4; i++) {
      const html = await page.content();
      expect(html.includes(titleOf('p4-e10'))).toBe(false);
      await page.waitForTimeout(500);
    }
    await page.getByRole('link', { name: /^Partie 4 :/ }).click();
    await expect(row(page, 'p4-e10').locator('.censor')).toBeVisible();
    await expect(row(page, 'p4-e10')).not.toContainText(titleOf('p4-e10'));
  });

  test('un autre compte sur le même appareil ne voit rien du précédent', async ({
    page,
    context,
  }) => {
    await signUp(page);
    await page.goto('/profil');
    await page.getByRole('switch', { name: 'Mode anti-spoil' }).click();
    await page.getByRole('link', { name: 'Parties' }).click();
    await page.getByRole('link', { name: /^Partie 4 :/ }).click();
    await expect(row(page, 'p4-e10')).toContainText(titleOf('p4-e10'));
    // Session révoquée côté navigateur puis déconnexion applicative.
    await context.clearCookies();
    await page.getByRole('link', { name: 'Profil' }).click();
    await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
    await expect(page).toHaveURL('/connexion');

    await page.route('**/api/catalog', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    await page.getByRole('tab', { name: 'Inscription' }).click();
    await page.getByLabel('Pseudo').fill(`Autre_${Date.now().toString(36).slice(-5)}`);
    await page.getByLabel('Mot de passe', { exact: true }).fill('ora-ora-ora-42!');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page).toHaveURL('/');
    await page.goto('/parties/4');
    for (let i = 0; i < 3; i++) {
      expect((await page.content()).includes(titleOf('p4-e10'))).toBe(false);
      await page.waitForTimeout(400);
    }
    await expect(row(page, 'p4-e10').locator('.censor')).toBeVisible();
  });
});
