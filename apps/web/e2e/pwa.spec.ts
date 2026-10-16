import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

test('le service worker s’enregistre et l’appli remplit les critères d’installabilité', async ({
  page,
  context,
}) => {
  await page.goto('/connexion');
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  expect(scope).toBe(new URL('/', page.url()).toString());

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const res = await fetch(link?.href ?? '');
    return (await res.json()) as { display: string };
  });
  expect(manifest.display).toBe('standalone');

  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
    installabilityErrors: { errorId: string }[];
  };
  expect(installabilityErrors).toEqual([]);
});

test('aucune réponse /api n’est mise en cache par le service worker', async ({ page }) => {
  await signUp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto('/parties/1');
  await page.waitForLoadState('networkidle');
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) urls.push(request.url);
    }
    return urls;
  });
  expect(cached.length).toBeGreaterThan(5);
  expect(cached.filter((u) => new URL(u).pathname.startsWith('/api'))).toEqual([]);
});

test('hors connexion, l’app shell s’affiche avec l’écran « Pas de réseau »', async ({
  page,
  context,
}) => {
  await signUp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pas de réseau…' })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect(page.getByRole('heading', { name: 'Ta progression' })).toBeVisible();
});
