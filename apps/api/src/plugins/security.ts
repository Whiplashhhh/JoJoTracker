import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import { AppError } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Vrai pour une route d'API, y compris une URL encodée (/%61pi/...) ou une 404 sous /api. */
export function isApiRequest(routeUrl: string | undefined, rawUrl: string): boolean {
  if (routeUrl?.startsWith('/api')) return true;
  let path = rawUrl;
  try {
    path = decodeURIComponent(rawUrl.split('?')[0] ?? rawUrl);
  } catch {
    // URL mal encodée : on garde la forme brute.
  }
  return path === '/api' || path.startsWith('/api/');
}

/** En-têtes de sécurité (CSP stricte, sans aucune ressource externe) et protection CSRF. */
export async function registerSecurity(app: FastifyInstance, config: Config): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        scriptSrcAttr: ["'none'"],
        upgradeInsecureRequests: config.cookieSecure ? [] : null,
      },
    },
    // L'appli ne charge rien de tiers : on peut isoler strictement.
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    strictTransportSecurity: config.cookieSecure
      ? { maxAge: 31_536_000, includeSubDomains: false }
      : false,
  });

  // Toute requête mutante est contrôlée, quel que soit le chemin (pas de contournement par
  // encodage du type /%61pi/...). Aucune route mutante n'existe hors de /api.
  app.addHook('onRequest', (request, _reply, done) => {
    if (SAFE_METHODS.has(request.method)) {
      done();
      return;
    }
    const origin = request.headers.origin;
    let source: string | undefined = typeof origin === 'string' ? origin : undefined;
    if (!source && typeof request.headers.referer === 'string') {
      try {
        source = new URL(request.headers.referer).origin;
      } catch {
        source = undefined;
      }
    }
    if (source !== config.appOrigin) {
      request.log.warn({ origin: source ?? null }, 'origine refusée (CSRF)');
      done(new AppError(403, 'CSRF', 'Origine de la requête non autorisée.'));
      return;
    }
    done();
  });

  // Aucune réponse d'API ne doit être mise en cache (fraîcheur + anti-spoil).
  app.addHook('onSend', (request, reply, payload, done) => {
    if (isApiRequest(request.routeOptions.url, request.url)) {
      reply.header('Cache-Control', 'no-store');
      reply.header('Pragma', 'no-cache');
    }
    done(null, payload);
  });
}
