import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { paletteFor, paletteVars } from './palettes';
import { ThemeContext } from './theme-context';

/** Applique la palette courante (accueil ou partie) à toute l'appli, avec transition. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [part, setPart] = useState<number | undefined>(undefined);
  const palette = paletteFor(part);

  useEffect(() => {
    document.body.style.backgroundColor = palette.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg);
  }, [palette.bg]);

  const value = useMemo(() => ({ part, setPart }), [part]);
  return (
    <ThemeContext.Provider value={value}>
      <div className="theme-root" data-part={part ?? 'home'} style={paletteVars(palette)}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
