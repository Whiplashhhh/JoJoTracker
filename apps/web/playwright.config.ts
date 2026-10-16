import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4310;
const BASE_URL = `http://localhost:${PORT}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

/**
 * Tests E2E : l'API de développement (PGlite en mémoire) sert le front buildé (`vite build`),
 * exactement comme l'image de production (même origine, service worker actif).
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    ...(executablePath ? { launchOptions: { executablePath, args: ['--no-sandbox'] } } : {}),
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'node --import tsx src/dev.ts',
    cwd: fileURLToPath(new URL('../api', import.meta.url)),
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      APP_ORIGIN: BASE_URL,
      PGLITE_DIR: 'memory',
      WEB_DIST: fileURLToPath(new URL('./dist', import.meta.url)),
      LOG_LEVEL: 'warn',
      FAKE_NOW: '2026-10-16T10:00:00Z',
    },
  },
});
