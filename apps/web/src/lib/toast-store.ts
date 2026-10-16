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
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  for (const l of listeners) l();
}

export const toast = {
  show(input: Omit<Toast, 'id' | 'duration' | 'tone'> & Partial<Pick<Toast, 'duration' | 'tone'>>) {
    const id = nextId++;
    const item: Toast = { tone: 'info', duration: 5000, ...input, id };
    // Trois toasts maximum à l'écran : les plus anciens cèdent leur place.
    toasts = [...toasts.slice(-2), item];
    if (item.duration !== null) {
      timers.set(
        id,
        setTimeout(() => {
          toast.dismiss(id);
        }, item.duration),
      );
    }
    emit();
    return id;
  },
  error(message: string) {
    return toast.show({ message, tone: 'error', duration: 6000 });
  },
  dismiss(id: number) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, () => toasts);
}
