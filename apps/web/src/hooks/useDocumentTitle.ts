import { useEffect } from 'react';

/** Titre de l'onglet. Ne jamais y mettre de titre d'épisode (anti-spoil). */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} — JoJo Tracker` : 'JoJo Tracker';
  }, [title]);
}
