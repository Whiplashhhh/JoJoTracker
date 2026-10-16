/** Vibration courte si disponible et si l'utilisateur n'a pas demandé moins d'animations. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Certains navigateurs refusent la vibration hors geste utilisateur : sans importance.
  }
}
