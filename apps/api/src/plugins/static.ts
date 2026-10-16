import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

/**
 * Sert le front buildé (même origine que l'API) avec un fallback SPA vers index.html.
 * Les assets fingerprintés sont cachés un an ; le reste (index, sw.js, manifest) est revalidé.
 */
export async function registerStatic(
  app: FastifyInstance,
  webDist: string | undefined,
): Promise<void> {
  const hasWeb = webDist !== undefined && existsSync(join(webDist, 'index.html'));
  if (hasWeb) {
    await app.register(fastifyStatic, {
      root: webDist,
      wildcard: false,
      index: false,
      setHeaders(res, path) {
        const immutable = /[/\\]assets[/\\]/.test(path);
        res.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
  } else {
    app.log.warn({ webDist }, 'front introuvable : seule l’API est servie');
  }

  app.setNotFoundHandler((request, reply) => {
    const accept = request.headers.accept ?? '';
    if (
      hasWeb &&
      (request.method === 'GET' || request.method === 'HEAD') &&
      !request.url.startsWith('/api/') &&
      request.url !== '/api' &&
      accept.includes('text/html')
    ) {
      reply.header('Cache-Control', 'no-cache');
      return reply.type('text/html; charset=utf-8').sendFile('index.html');
    }
    return reply
      .status(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' } });
  });
}
