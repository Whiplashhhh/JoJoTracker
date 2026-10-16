import type { CSSProperties } from 'react';

interface Glyph {
  text: string;
  /** Position en % du conteneur. */
  x: number;
  y: number;
  size: number;
  rotate: number;
  delay?: number;
}

interface OnomatopoeiaProps {
  glyphs: readonly Glyph[];
  className?: string;
  tone?: 'accent' | 'accent2' | 'paper' | 'ink';
}

/** Onomatopées génériques flottantes (décoratives, ignorées des lecteurs d'écran). */
export function Onomatopoeia({ glyphs, className = '', tone = 'accent' }: OnomatopoeiaProps) {
  return (
    <div className={`onoma onoma--${tone} ${className}`} aria-hidden="true">
      {glyphs.map((g, i) => (
        <span
          key={i}
          className="onoma__glyph"
          style={
            {
              left: `${g.x}%`,
              top: `${g.y}%`,
              fontSize: `${g.size}px`,
              '--r': `${g.rotate}deg`,
              animationDelay: `${g.delay ?? i * -1.3}s`,
            } as CSSProperties
          }
        >
          {g.text}
        </span>
      ))}
    </div>
  );
}

export const GOGOGO = 'ゴゴゴゴ';
export const DODODO = 'ドドドド';
export const DON = 'ドン！';
export const BAAN = 'バーン';
