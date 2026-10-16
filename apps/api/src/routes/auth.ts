import {
  authConfigSchema,
  loginBodySchema,
  registerBodySchema,
  type AuthConfig,
  type MeResponse,
} from '@jojo/shared';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { userSettings, users } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { dummyVerify, hashPassword, verifyPassword } from '../lib/passwords.js';
import { constantTimeEquals } from '../lib/tokens.js';
import { createSession, deleteSessionByToken } from '../services/sessions.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 3 && current && typeof current === 'object'; i++) {
    if ((current as { code?: unknown }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db, config } = ctx;

  app.get('/api/auth/config', (): AuthConfig =>
    authConfigSchema.parse({
      signupOpen: config.allowSignup,
      inviteRequired: config.allowSignup && config.inviteCode !== undefined,
    }),
  );

  app.post(
    '/api/auth/register',
    { config: { rateLimit: ctx.rateLimits.register } },
    async (request, reply): Promise<MeResponse> => {
      if (!config.allowSignup) {
        throw new AppError(403, 'SIGNUP_CLOSED', 'Les inscriptions sont fermées.');
      }
      const input = registerBodySchema.parse(request.body);
      if (
        config.inviteCode !== undefined &&
        !constantTimeEquals(input.inviteCode ?? '', config.inviteCode)
      ) {
        throw new AppError(403, 'INVITE_CODE_INVALID', "Code d'invitation invalide.");
      }

      const taken = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(sql`lower(${users.username})`, input.username.toLowerCase()))
        .limit(1);
      if (taken.length > 0) {
        throw new AppError(409, 'USERNAME_TAKEN', 'Ce pseudo est déjà pris.');
      }

      const passwordHash = await hashPassword(input.password);
      const now = ctx.now();
      let user: typeof users.$inferSelect;
      try {
        user = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(users)
            .values({
              username: input.username,
              passwordHash,
              createdAt: now,
              passwordChangedAt: now,
            })
            .returning();
          if (!created) throw new Error('insertion utilisateur échouée');
          await tx
            .insert(userSettings)
            .values({ userId: created.id, antiSpoil: true, updatedAt: now });
          return created;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, 'USERNAME_TAKEN', 'Ce pseudo est déjà pris.');
        }
        throw error;
      }

      const { token } = await createSession(db, user.id, input.remember, now, ctx.sessionPolicy);
      ctx.setSessionCookie(reply, token, input.remember);
      request.log.info({ userId: user.id }, 'inscription');
      reply.status(201);
      return {
        user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
        settings: { antiSpoil: true },
      };
    },
  );

  app.post(
    '/api/auth/login',
    { config: { rateLimit: ctx.rateLimits.login } },
    async (request, reply): Promise<MeResponse> => {
      const started = performance.now();
      const input = loginBodySchema.parse(request.body);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(sql`lower(${users.username})`, input.username.toLowerCase()))
        .limit(1);
      const valid = user
        ? await verifyPassword(user.passwordHash, input.password)
        : await dummyVerify(input.password);

      if (!user || !valid) {
        const elapsed = performance.now() - started;
        await sleep(Math.max(0, ctx.loginFailureMinMs - elapsed));
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Pseudo ou mot de passe incorrect.');
      }

      // Rotation : l'éventuelle session précédente de ce navigateur est détruite.
      const previous = ctx.sessionToken(request);
      if (previous) await deleteSessionByToken(db, previous);

      const { token } = await createSession(
        db,
        user.id,
        input.remember,
        ctx.now(),
        ctx.sessionPolicy,
      );
      ctx.setSessionCookie(reply, token, input.remember);
      const [settings] = await db
        .select({ antiSpoil: userSettings.antiSpoil })
        .from(userSettings)
        .where(eq(userSettings.userId, user.id));
      request.log.info({ userId: user.id }, 'connexion');
      return {
        user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
        settings: { antiSpoil: settings?.antiSpoil ?? true },
      };
    },
  );

  app.post('/api/auth/logout', async (request, reply) => {
    const token = ctx.sessionToken(request);
    if (token) await deleteSessionByToken(db, token);
    ctx.clearSessionCookie(reply);
    return reply.status(204).send();
  });
}
