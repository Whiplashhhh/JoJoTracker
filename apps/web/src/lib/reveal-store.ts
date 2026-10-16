import { useSyncExternalStore } from 'react';

/**
 * Titres révélés volontairement (appui long → confirmation).
 * Mémoire vive uniquement : rien n'est persisté (ni localStorage, ni cache).
 */
const revealed = new Map<string, string | null>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  for (const l of listeners) l();
}

export const revealStore = {
  set(id: string, title: string | null) {
    revealed.set(id, title);
    emit();
  },
  forget(ids: readonly string[]) {
    let changed = false;
    for (const id of ids) changed = revealed.delete(id) || changed;
    if (changed) emit();
  },
  clear() {
    revealed.clear();
    emit();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `undefined` = non révélé ; `null` = révélé mais titre inconnu. */
export function useRevealedTitle(id: string): string | null | undefined {
  useSyncExternalStore(subscribe, () => version);
  return revealed.has(id) ? (revealed.get(id) ?? null) : undefined;
}
