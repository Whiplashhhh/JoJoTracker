import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error' | 'success';
  /** Durée d'affichage en ms ; `null` = jusqu'à action/fermeture. */
  duration: number | null;
  action?: { label: string; run: () => void };
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<
  number,
  { handle: ReturnType<typeof setTimeout> | null; remaining: number; startedAt: number }
>();

function arm(id: number, ms: number) {
  timers.set(id, {
    handle: setTimeout(() => {
      toast.dismiss(id);
    }, ms),
    remaining: ms,
    startedAt: Date.now(),
  });
}

function emit() {
  for (const l of listeners) l();
}

export const toast = {
  show(input: Omit<Toast, 'id' | 'duration' | 'tone'> & Partial<Pick<Toast, 'duration' | 'tone'>>) {
    const id = nextId++;
    const item: Toast = { tone: 'info', duration: 5000, ...input, id };
    // Trois toasts temporaires maximum : les plus anciens cèdent leur place. Les toasts
    // persistants (ex. « Nouvelle version disponible ») ne sont jamais évincés.
    const persistent = toasts.filter((t) => t.duration === null);
    const transient = toasts.filter((t) => t.duration !== null);
    for (const old of transient.slice(0, Math.max(0, transient.length - 2))) clearTimer(old.id);
    toasts = [...persistent, ...transient.slice(-2), item];
    if (item.duration !== null) arm(id, item.duration);
    emit();
    return id;
  },
  error(message: string) {
    return toast.show({ message, tone: 'error', duration: 6000 });
  },
  dismiss(id: number) {
    clearTimer(id);
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  /** Suspend le compte à rebours (survol, focus clavier). */
  pause(id: number) {
    const timer = timers.get(id);
    if (!timer?.handle) return;
    clearTimeout(timer.handle);
    timers.set(id, {
      handle: null,
      remaining: timer.remaining - (Date.now() - timer.startedAt),
      startedAt: 0,
    });
    paused = new Set(paused).add(id);
    emit();
  },
  resume(id: number) {
    const timer = timers.get(id);
    if (!timer || timer.handle) return;
    arm(id, Math.max(1500, timer.remaining));
    const next = new Set(paused);
    next.delete(id);
    paused = next;
    emit();
  },
  clear() {
    for (const t of toasts) clearTimer(t.id);
    toasts = [];
    emit();
  },
};

let paused: ReadonlySet<number> = new Set();

function clearTimer(id: number) {
  const timer = timers.get(id);
  if (timer?.handle) clearTimeout(timer.handle);
  timers.delete(id);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, () => toasts);
}

export function usePausedToasts(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, () => paused);
}
