import type { CSSProperties } from 'react';
import { censorWidth } from '../lib/episode';

interface CensorBarProps {
  episodeId: string;
  /** Si fourni, la bande devient un bouton « révéler ». */
  onReveal?: () => void;
  episodeNumber: number;
}

/** Bande d'encre censurée : remplace un titre non vu. Aucun texte réel n'est présent dans le DOM. */
export function CensorBar({ episodeId, onReveal, episodeNumber }: CensorBarProps) {
  const style = { '--censor-w': `${censorWidth(episodeId)}%` } as CSSProperties;
  const inner = (
    <>
      <span className="censor__ink" aria-hidden="true" />
      <span className="censor__marks" aria-hidden="true">
        ？？？
      </span>
    </>
  );
  if (!onReveal) {
    return (
      <span className="censor" style={style} role="img" aria-label="Titre masqué">
        {inner}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="censor censor--button"
      style={style}
      aria-label={`Titre masqué. Révéler le titre de l’épisode ${episodeNumber}`}
      onClick={onReveal}
    >
      {inner}
    </button>
  );
}
