import type { ApiErrorBody } from '@jojo/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

/**
 * Résumé d'erreur pour les logs, sans paramètres de requête SQL (les erreurs Drizzle les
 * incluent dans leur message : empreintes de mot de passe, jetons hashés…).
 */
function describeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: String(error) };
  const cause = error.cause instanceof Error ? error.cause : undefined;
  const firstLine = (message: string) => message.split('\n')[0]?.slice(0, 300);
  return {
    type: error.name,
    message: firstLine(error.message.replace(/params:.*$/s, '')),
    code: (error as { code?: unknown }).code,
    stack: error.stack?.split('\n').slice(1, 6).join('\n'),
    ...(cause
      ? {
          cause: {
            type: cause.name,
            message: firstLine(cause.message),
            code: (cause as { code?: unknown }).code,
          },
        }
      : {}),
  };
}

function body(code: string, message: string, fields?: Record<string, string>): ApiErrorBody {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
}

/** Gestion d'erreurs centralisée : format JSON homogène, aucun détail interne exposé. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(body(error.code, error.message));
    }
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.join('.') || '_';
        fields[key] ??= issue.message;
      }
      return reply.status(400).send(body('VALIDATION_ERROR', 'Données invalides.', fields));
    }
    const status = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (status >= 400 && status < 500) {
      request.log.info({ code: error.code }, 'requête rejetée');
      const message =
        status === 413
          ? 'Requête trop volumineuse.'
          : status === 415
            ? 'Format de requête non pris en charge.'
            : 'Requête invalide.';
      return reply.status(status).send(body('BAD_REQUEST', message));
    }
    request.log.error({ err: describeError(error) }, 'erreur interne');
    return reply.status(500).send(body('INTERNAL', 'Erreur interne du serveur.'));
  });
}
