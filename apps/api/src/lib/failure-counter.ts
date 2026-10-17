/**
 * Compteur d'échecs en mémoire, par clé et fenêtre fixe (instance unique).
 * Sert à limiter les essais de mot de passe sur un même pseudo, quelle que soit l'IP.
 */
export class FailureCounter {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  isBlocked(key: string, now: number): boolean {
    const entry = this.entries.get(key);
    return entry !== undefined && entry.resetAt > now && entry.count >= this.max;
  }

  /** Millisecondes avant déblocage. */
  retryAfter(key: string, now: number): number {
    const entry = this.entries.get(key);
    return entry ? Math.max(0, entry.resetAt - now) : 0;
  }

  fail(key: string, now: number): void {
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
    if (this.entries.size > 10_000) this.prune(now);
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(key);
  }
}
