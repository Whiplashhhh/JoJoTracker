import type { ErrorCode } from '@jojo/shared';

/** Erreur métier sûre à exposer au client. */
export class AppError extends Error {
  override name = 'AppError';
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Connexion requise.');
export const notFound = (message = 'Ressource introuvable.') =>
  new AppError(404, 'NOT_FOUND', message);
