import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

interface CatalogFile {
  parts: { name: string; seasons: { name: string }[] }[];
  episodes: { id: string; titleFr: string | null; titleEn: string | null }[];
}

export const catalog = JSON.parse(
  readFileSync(new URL('../../api/src/catalog/episodes.json', import.meta.url), 'utf8'),
) as CatalogFile;

export function titleOf(id: string): string {
  const ep = catalog.episodes.find((e) => e.id === id);
  const title = ep?.titleFr ?? ep?.titleEn;
  if (!title) throw new Error(`Pas de titre pour ${id}`);
  return title;
}

export const PASSWORD = 'ora-ora-ora-42!';

export function uniqueUser(prefix = 'Lectrice'): string {
  return `${prefix}_${Date.now().toString(36).slice(-5)}${Math.floor(Math.random() * 100)}`;
}

export async function signUp(page: Page, username = uniqueUser()): Promise<string> {
  await page.goto('/connexion');
  await page.getByRole('tab', { name: 'Inscription' }).click();
  await page.getByLabel('Pseudo').fill(username);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Ta progression' })).toBeVisible();
  return username;
}

export function row(page: Page, id: string) {
  return page.locator(`[data-episode="${id}"]`);
}
