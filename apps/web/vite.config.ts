import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

interface SplashScreen {
  device: string;
  width: number;
  height: number;
  ratio: number;
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const splashScreens = JSON.parse(
  readFileSync(new URL('./assets-src/splash-screens.json', import.meta.url), 'utf8'),
) as SplashScreen[];

/** Injecte les écrans de démarrage iOS (apple-touch-startup-image) dans index.html. */
function appleSplashLinks(): Plugin {
  return {
    name: 'jojo:apple-splash-links',
    transformIndexHtml() {
      return splashScreens.map((s) => ({
        tag: 'link',
        injectTo: 'head' as const,
        attrs: {
          rel: 'apple-touch-startup-image',
          href: `/splash/apple-splash-${s.width * s.ratio}x${s.height * s.ratio}.png`,
          media: `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`,
        },
      }));
    },
  };
}

export const THEME_COLOR = '#0E0B10';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    appleSplashLinks(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'generateSW',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: '/',
        name: 'JoJo Tracker — suivi sans spoil',
        short_name: 'JoJo Tracker',
        description:
          "Coche les épisodes de JoJo's Bizarre Adventure que tu as vus et sache où tu en es, sans jamais te faire spoiler.",
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: THEME_COLOR,
        theme_color: THEME_COLOR,
        categories: ['entertainment', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          {
            name: 'Reprendre',
            short_name: 'Reprendre',
            description: 'Ouvre directement le prochain épisode à regarder',
            url: '/?reprendre=1',
            icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Mes parties',
            short_name: 'Parties',
            description: 'La liste des parties et ta progression',
            url: '/parties',
            icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // App shell + assets statiques précachés (les écrans de démarrage iOS ne servent qu'à l'installation).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['splash/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(\/|$)/],
        // Les réponses d'API ne sont JAMAIS mises en cache (fraîcheur + anti-spoil).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'GET',
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
  preview: {
    port: 4173,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Bibliothèques séparées du code de l'appli : meilleur cache entre deux versions.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router/ },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/,
            },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
});
