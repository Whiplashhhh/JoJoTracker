/**
 * Contrats d'API partagés entre le serveur et le client.
 *
 * IMPORTANT (anti-spoil) : ce package est embarqué dans le bundle front.
 * Il ne doit JAMAIS contenir de titre d'épisode ni aucune donnée de catalogue.
 */
import { z } from 'zod';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 256;

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, `Le pseudo doit faire au moins ${USERNAME_MIN} caractères.`)
  .max(USERNAME_MAX, `Le pseudo doit faire au plus ${USERNAME_MAX} caractères.`)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Lettres non accentuées, chiffres, « _ » et « - » uniquement.');

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères.`)
  .max(PASSWORD_MAX, `Le mot de passe doit faire au plus ${PASSWORD_MAX} caractères.`);

export const episodeIdSchema = z
  .string()
  .regex(/^p[1-9]\d?-e[1-9]\d{0,2}$/, 'Identifiant d’épisode invalide.');

export const partNumberSchema = z.coerce.number().int().min(1).max(99);

/** Date calendaire ISO (AAAA-MM-JJ). */
export const isoDateSchema = z.iso.date();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  inviteCode: z.string().max(256).optional(),
  remember: z.boolean().default(true),
});
export type RegisterBody = z.input<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(PASSWORD_MAX),
  remember: z.boolean().default(true),
});
export type LoginBody = z.input<typeof loginBodySchema>;

export const authConfigSchema = z.object({
  signupOpen: z.boolean(),
  inviteRequired: z.boolean(),
});
export type AuthConfig = z.infer<typeof authConfigSchema>;

export const settingsSchema = z.object({
  antiSpoil: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsBodySchema = settingsSchema.partial().strict();
export type UpdateSettingsBody = z.infer<typeof updateSettingsBodySchema>;

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const meResponseSchema = z.object({
  user: userSchema,
  settings: settingsSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: passwordSchema,
});
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export const deleteAccountBodySchema = z.object({
  confirmUsername: z.string().trim().min(1).max(64),
});
export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;

// ---------------------------------------------------------------------------
// Catalogue (vue utilisateur, filtrée anti-spoil côté serveur)
// ---------------------------------------------------------------------------

export const seasonViewSchema = z.object({
  key: z.string(),
  name: z.string(),
});
export type SeasonView = z.infer<typeof seasonViewSchema>;

export const partViewSchema = z.object({
  number: z.number().int(),
  name: z.string(),
  seasons: z.array(seasonViewSchema),
});
export type PartView = z.infer<typeof partViewSchema>;

/**
 * Un épisode tel que vu par un utilisateur.
 * - `title` n'est renseigné que si l'épisode est vu (ou si le mode anti-spoil est désactivé).
 * - `titleHidden` vaut `true` quand le serveur a volontairement retiré le titre.
 * - `title: null` + `titleHidden: false` = titre inconnu (absent des sources).
 */
export const episodeViewSchema = z.object({
  id: z.string(),
  partNumber: z.number().int(),
  season: z.string().nullable(),
  numberInPart: z.number().int(),
  officialNumber: z.number().int(),
  airDate: z.string().nullable(),
  watched: z.boolean(),
  watchedAt: z.string().nullable(),
  title: z.string().nullable(),
  titleHidden: z.boolean(),
});
export type EpisodeView = z.infer<typeof episodeViewSchema>;

export const catalogResponseSchema = z.object({
  /** Date du jour côté serveur (fuseau Europe/Paris), AAAA-MM-JJ. */
  today: z.string(),
  antiSpoil: z.boolean(),
  parts: z.array(partViewSchema),
  episodes: z.array(episodeViewSchema),
});
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;

export const MAX_BATCH = 500;

export const setWatchedBodySchema = z.object({
  watched: z.boolean(),
  items: z
    .array(
      z.object({
        episodeId: episodeIdSchema,
        /** Uniquement pour restaurer une date d'origine (annulation). */
        watchedAt: z.iso.datetime({ offset: true }).optional(),
      }),
    )
    .min(1)
    .max(MAX_BATCH),
});
export type SetWatchedBody = z.infer<typeof setWatchedBodySchema>;

export const setWatchedResponseSchema = z.object({
  episodes: z.array(episodeViewSchema),
});
export type SetWatchedResponse = z.infer<typeof setWatchedResponseSchema>;

export const revealResponseSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
});
export type RevealResponse = z.infer<typeof revealResponseSchema>;

export const exportSchema = z.object({
  format: z.literal('jojo-tracker-export'),
  version: z.literal(1),
  exportedAt: z.string(),
  user: z.object({ username: z.string(), createdAt: z.string() }),
  settings: settingsSchema,
  watched: z.array(
    z.object({
      episodeId: z.string(),
      partNumber: z.number().int(),
      numberInPart: z.number().int(),
      watchedAt: z.string(),
    }),
  ),
});
export type ExportData = z.infer<typeof exportSchema>;

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

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

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
