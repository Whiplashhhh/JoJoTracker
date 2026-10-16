import type { EpisodeView } from '@jojo/shared/client';
import { createContext, useContext } from 'react';

export interface Hit {
  nonce: number;
  watched: boolean;
}

export interface TrackingApi {
  /** Tap sur le sceau d'un épisode. */
  toggle: (episode: EpisodeView) => void;
  /** Coche directement (carte « Reprendre ») en proposant les précédents si besoin. */
  markSeen: (episode: EpisodeView) => void;
  requestReveal: (episode: EpisodeView) => void;
  requestPartAction: (partNumber: number, action: 'watch' | 'reset') => void;
  /** Derniers épisodes touchés (pour déclencher les micro-interactions). */
  hits: ReadonlyMap<string, Hit>;
  /** Épisodes en attente de réponse serveur. */
  pending: ReadonlySet<string>;
}

export const TrackingContext = createContext<TrackingApi | null>(null);

export function useTracking(): TrackingApi {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking doit être utilisé dans <TrackingProvider>');
  return ctx;
}
