export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 256;
/** Nombre maximal d'épisodes par requête de cochage. */
export const MAX_BATCH = 500;

export const ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'INVALID_CREDENTIALS',
  'USERNAME_TAKEN',
  'INVITE_CODE_INVALID',
  'SIGNUP_CLOSED',
  'NOT_FOUND',
  'NOT_AIRED',
  'CONFIRMATION_MISMATCH',
  'RATE_LIMITED',
  'CSRF',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
