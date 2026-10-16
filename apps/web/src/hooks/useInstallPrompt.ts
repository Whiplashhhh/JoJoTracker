import { useSyncExternalStore } from 'react';
import { storage } from '../lib/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'jojo.install.dismissed';
const VISITS_KEY = 'jojo.visits';

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
let snapshot = computeSnapshot();

export type InstallMode = 'standalone' | 'prompt' | 'ios' | 'unsupported';

export interface InstallState {
  mode: InstallMode;
  dismissed: boolean;
  /** Nombre d'ouvertures de l'appli (la bannière n'apparaît qu'à partir de la 2e). */
  visits: number;
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  return iOS && ua.includes('Safari') && !otherBrowser;
}

function computeSnapshot(): InstallState {
  if (typeof window === 'undefined') return { mode: 'unsupported', dismissed: false, visits: 0 };
  let mode: InstallMode = 'unsupported';
  if (installed || isStandalone()) mode = 'standalone';
  else if (deferred) mode = 'prompt';
  else if (isIosSafari()) mode = 'ios';
  return {
    mode,
    dismissed: storage.get(DISMISSED_KEY) === '1',
    visits: Number(storage.get(VISITS_KEY) ?? '0'),
  };
}

function emit() {
  snapshot = computeSnapshot();
  for (const l of listeners) l();
}

/** À appeler au démarrage, le plus tôt possible (l'évènement peut arriver avant le rendu). */
export function initInstallPrompt(): void {
  storage.set(VISITS_KEY, String(Number(storage.get(VISITS_KEY) ?? '0') + 1));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', emit);
  emit();
}

export const install = {
  async prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferred) return 'unavailable';
    const event = deferred;
    deferred = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'dismissed') storage.set(DISMISSED_KEY, '1');
    emit();
    return outcome;
  },
  dismiss() {
    storage.set(DISMISSED_KEY, '1');
    emit();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, () => snapshot);
}
