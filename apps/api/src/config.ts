import { z } from 'zod';

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((v) => v === 'true' || v === '1' || v === 'yes');

/** Une chaîne vide dans le .env équivaut à « non défini ». */
function emptyAsUndefined(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.preprocess(
      emptyAsUndefined,
      z
        .string()
        .regex(
          /^postgres(ql)?:\/\//,
          'DATABASE_URL doit commencer par postgres:// ou postgresql://',
        )
        .optional(),
    ),
    POSTGRES_HOST: z.preprocess(emptyAsUndefined, z.string().optional()),
    POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    POSTGRES_USER: z.preprocess(emptyAsUndefined, z.string().optional()),
    POSTGRES_PASSWORD: z.preprocess(emptyAsUndefined, z.string().optional()),
    POSTGRES_DB: z.preprocess(emptyAsUndefined, z.string().optional()),
    APP_ORIGIN: z
      .url({ error: 'APP_ORIGIN doit être une URL (ex. https://jojo.example.com).' })
      .transform((v) => new URL(v).origin),
    COOKIE_SECURE: z.preprocess(emptyAsUndefined, booleanFromEnv.optional()),
    ALLOW_SIGNUP: z.preprocess(emptyAsUndefined, booleanFromEnv.default(true)),
    INVITE_CODE: z.preprocess(
      emptyAsUndefined,
      z.string().min(6, 'INVITE_CODE doit faire au moins 6 caractères.').max(256).optional(),
    ),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY: z.string().default('loopback,linklocal,uniquelocal'),
    WEB_DIST: z.preprocess(emptyAsUndefined, z.string().optional()),
    TZ_CATALOG: z.string().default('Europe/Paris'),
  })
  .superRefine((env, ctx) => {
    if (env.DATABASE_URL) return;
    for (const key of [
      'POSTGRES_HOST',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_DB',
    ] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} est obligatoire quand DATABASE_URL n'est pas défini.`,
        });
      }
    }
  })
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL ?? buildDatabaseUrl(env),
    appOrigin: env.APP_ORIGIN,
    cookieSecure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    allowSignup: env.ALLOW_SIGNUP,
    inviteCode: env.INVITE_CODE,
    sessionTtlDays: env.SESSION_TTL_DAYS,
    logLevel: env.LOG_LEVEL,
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    webDist: env.WEB_DIST,
    timeZone: env.TZ_CATALOG,
  }));

export type Config = z.output<typeof envSchema>;

/** Construit l'URL de connexion en encodant les identifiants (mots de passe avec + / = …). */
function buildDatabaseUrl(env: {
  POSTGRES_HOST?: string | undefined;
  POSTGRES_PORT: number;
  POSTGRES_USER?: string | undefined;
  POSTGRES_PASSWORD?: string | undefined;
  POSTGRES_DB?: string | undefined;
}): string {
  const user = encodeURIComponent(env.POSTGRES_USER ?? '');
  const password = encodeURIComponent(env.POSTGRES_PASSWORD ?? '');
  const db = encodeURIComponent(env.POSTGRES_DB ?? '');
  return `postgres://${user}:${password}@${env.POSTGRES_HOST ?? ''}:${env.POSTGRES_PORT}/${db}`;
}

function parseTrustProxy(value: string): boolean | string[] {
  const v = value.trim();
  if (v === 'true') return true;
  if (v === 'false' || v === '') return false;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** Valide l'environnement ; lève une erreur lisible si la configuration est invalide. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(env)'} : ${issue.message}`,
    );
    throw new ConfigError(`Configuration invalide :\n${lines.join('\n')}`);
  }
  return result.data;
}
