import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db/types.js';
import { unauthenticated } from './lib/errors.js';
import { calendarDate } from './lib/time.js';
import { resolveSession, sessionLifetimeMs, type ActiveSession } from './services/sessions.js';

export interface RateLimitRule {
  max: number;
  timeWindow: number;
}

export interface RateLimits {
  login: RateLimitRule;
  /** Échecs de connexion par pseudo, toutes IP confondues (rotation d'adresses). */
  loginPerUsername: RateLimitRule;
  register: RateLimitRule;
  sensitive: RateLimitRule;
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  login: { max: 10, timeWindow: 15 * 60 * 1000 },
  loginPerUsername: { max: 20, timeWindow: 15 * 60 * 1000 },
  register: { max: 5, timeWindow: 60 * 60 * 1000 },
  sensitive: { max: 30, timeWindow: 15 * 60 * 1000 },
};

export class AppContext {
  readonly cookieName: string;

  constructor(
    readonly config: Config,
    readonly db: Db,
    readonly now: () => Date,
    readonly rateLimits: RateLimits,
    /** Durée minimale d'une réponse de connexion échouée (anti-énumération / anti-timing). */
    readonly loginFailureMinMs: number,
  ) {
    // Préfixe __Host- : cookie lié à l'origine exacte, uniquement possible en HTTPS.
    this.cookieName = config.cookieSecure ? '__Host-jojo_session' : 'jojo_session';
  }

  get sessionPolicy() {
    return { ttlDays: this.config.sessionTtlDays };
  }

  today(): string {
    return calendarDate(this.now(), this.config.timeZone);
  }

  setSessionCookie(reply: FastifyReply, token: string, persistent: boolean): void {
    reply.setCookie(this.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
      ...(persistent
        ? { maxAge: Math.floor(sessionLifetimeMs(true, this.sessionPolicy) / 1000) }
        : {}),
    });
  }

  clearSessionCookie(reply: FastifyReply): void {
    reply.clearCookie(this.cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
    });
  }

  sessionToken(request: FastifyRequest): string | undefined {
    const token = request.cookies[this.cookieName];
    return token && token.length <= 128 ? token : undefined;
  }

  /** Exige une session valide ; prolonge la fenêtre glissante si nécessaire. */
  async requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<ActiveSession> {
    const token = this.sessionToken(request);
    if (!token) throw unauthenticated();
    const session = await resolveSession(this.db, token, this.now(), this.sessionPolicy);
    if (!session) {
      this.clearSessionCookie(reply);
      throw unauthenticated();
    }
    if (session.refreshed && session.persistent) this.setSessionCookie(reply, token, true);
    return session;
  }
}
