/**
 * Suivi des écritures en cours (cochages). Le catalogue n'est jamais relu pendant une écriture :
 * une lecture partie avant la fin d'un PUT pourrait écraser l'état optimiste avec des données périmées.
 */
let pending = 0;
let waiters: (() => void)[] = [];

export const writeTracker = {
  start(): void {
    pending += 1;
  },
  end(): void {
    pending = Math.max(0, pending - 1);
    if (pending === 0) {
      const ready = waiters;
      waiters = [];
      for (const resolve of ready) resolve();
    }
  },
  get busy(): boolean {
    return pending > 0;
  },
  /** Résout dès qu'aucune écriture n'est en cours. */
  idle(): Promise<void> {
    if (pending === 0) return Promise.resolve();
    return new Promise((resolve) => {
      waiters.push(resolve);
    });
  },
};
