import { createContext, useContext, useEffect } from 'react';

export const ThemeContext = createContext<{
  part: number | undefined;
  setPart: (part: number | undefined) => void;
}>({ part: undefined, setPart: () => undefined });

/** Choisit la palette de la page courante (undefined = accueil). */
export function usePageTheme(part: number | undefined): void {
  const { setPart } = useContext(ThemeContext);
  useEffect(() => {
    setPart(part);
  }, [part, setPart]);
}
