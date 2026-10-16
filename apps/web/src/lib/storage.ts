/** Accès localStorage tolérant (navigation privée, stockage bloqué…). */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Stockage indisponible : la préférence ne sera simplement pas mémorisée.
    }
  },
};
