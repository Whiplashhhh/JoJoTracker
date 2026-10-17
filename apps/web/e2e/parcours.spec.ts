import { expect, test } from '@playwright/test';
import { row, signUp, titleOf } from './helpers';

test('parcours complet : inscription → cocher → précédents → annuler → partie terminée → déconnexion', async ({
  page,
}) => {
  const cspViolations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) cspViolations.push(msg.text());
  });
  await signUp(page);
  await expect(page.getByText('épisodes vus').first()).toBeVisible();

  // Aller dans la partie 1 depuis la grille des couvertures.
  await page.getByRole('link', { name: /^Partie 1 : Phantom Blood/ }).click();
  await expect(page).toHaveURL('/parties/1');
  await expect(page.getByRole('heading', { name: 'Phantom Blood' })).toBeVisible();

  // Cocher l'épisode 1 : seul son titre se révèle.
  await expect(row(page, 'p1-e1').getByRole('img', { name: 'Titre masqué' })).toHaveCount(0);
  await row(page, 'p1-e1').getByRole('button', { name: 'Marquer l’épisode 1 comme vu' }).click();
  await expect(row(page, 'p1-e1')).toContainText(titleOf('p1-e1'));
  await expect(row(page, 'p1-e2')).not.toContainText(titleOf('p1-e2'));
  await expect(row(page, 'p1-e2').locator('.censor')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Notifications' }).getByText(/vu !/)).toBeVisible();

  // Cocher l'épisode 5 → proposition de marquer les 3 précédents.
  await row(page, 'p1-e5').getByRole('button', { name: 'Marquer l’épisode 5 comme vu' }).click();
  const sheet = page.getByRole('dialog', { name: /Marquer aussi les 3 épisodes précédents/ });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Oui, tout marquer' }).click();
  for (const id of ['p1-e2', 'p1-e3', 'p1-e4', 'p1-e5']) {
    await expect(row(page, id)).toContainText(titleOf(id));
  }
  await expect(row(page, 'p1-e6')).not.toContainText(titleOf('p1-e6'));

  // Annuler via le toast : les 4 épisodes sont décochés et re-masqués.
  await page.getByRole('button', { name: 'Annuler' }).last().click();
  for (const id of ['p1-e2', 'p1-e3', 'p1-e4', 'p1-e5']) {
    await expect(row(page, id).locator('.censor')).toBeVisible();
    await expect(row(page, id)).not.toContainText(titleOf(id));
  }
  await expect(row(page, 'p1-e1')).toContainText(titleOf('p1-e1'));

  // Marquer toute la partie → célébration « TO BE CONTINUED ».
  await page.getByRole('button', { name: 'Actions sur la partie' }).click();
  await page.getByRole('button', { name: 'Marquer toute la partie comme vue' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tout marquer comme vu' }).click();
  const celebration = page.getByRole('dialog', { name: /Partie 1 terminée/ });
  await expect(celebration).toBeVisible();
  await expect(celebration.getByRole('img', { name: 'To be continued' })).toBeVisible();
  await expect(page.locator('.celebration__sepia')).toBeVisible();
  await celebration.getByRole('button', { name: 'Toucher pour continuer' }).click();
  await expect(celebration).toBeHidden();
  await expect(page.getByText('Terminée').first()).toBeVisible();

  // Déconnexion depuis le profil.
  await page.getByRole('link', { name: 'Profil' }).click();
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await expect(page).toHaveURL('/connexion');
  await page.goto('/');
  await expect(page).toHaveURL('/connexion');
  expect(cspViolations).toEqual([]);
});

test('carte « Reprendre » : « Je l’ai vu ! » coche le prochain épisode sans révéler le suivant', async ({
  page,
}) => {
  await signUp(page);
  const resume = page.locator('#reprendre');
  await expect(resume.getByRole('heading', { name: 'Épisode 1' })).toBeVisible();
  await resume.getByRole('button', { name: 'Je l’ai vu !' }).click();
  await expect(resume).toContainText(titleOf('p1-e1'));
  await resume.getByRole('button', { name: 'Épisode suivant' }).click();
  await expect(resume.getByRole('heading', { name: 'Épisode 2' })).toBeVisible();
  await expect(resume).not.toContainText(titleOf('p1-e2'));
});

test('les épisodes non diffusés sont visibles mais non cochables', async ({ page }) => {
  await signUp(page);
  await page.goto('/parties/7');
  const last = row(page, 'p7-e12');
  await expect(last).toContainText('Disponible le 04/12');
  await expect(last.getByRole('button', { name: /comme vu/ })).toHaveCount(0);
  await expect(last.getByRole('img', { name: 'Épisode 12 pas encore disponible' })).toBeVisible();
});
