# syntax=docker/dockerfile:1

# Image Node LTS (24 « Krypton ») épinglée.
ARG NODE_IMAGE=node:24.21.0-alpine3.24

# ---------------------------------------------------------------------------
# 1. Dépendances (couche mise en cache tant que les manifestes ne changent pas)
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
ENV CI=true
RUN npm install --global pnpm@10.34.6 && npm cache clean --force
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# 2. Build : front (Vite + service worker), API (esbuild), puis node_modules de prod
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @jojo/web build \
 && pnpm --filter @jojo/api build \
 && pnpm --filter @jojo/api deploy --prod --legacy /out/api

# ---------------------------------------------------------------------------
# 3. Image finale minimale, utilisateur non-root
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
# npm, npx et yarn sont inutiles à l'exécution : on réduit la surface d'attaque.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
WORKDIR /app
COPY --from=build --chown=node:node /out/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /out/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /src/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /src/apps/api/drizzle ./apps/api/drizzle
COPY --from=build --chown=node:node /src/apps/web/dist ./apps/web/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
# Au démarrage : migrations Drizzle → upsert du catalogue → écoute.
CMD ["node", "--enable-source-maps", "apps/api/dist/server.mjs"]
