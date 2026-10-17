import {
  isAired,
  justCompletedParts,
  previousUnwatched,
  type CatalogResponse,
  type EpisodeView,
  type SetWatchedBody,
} from '@jojo/shared/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, errorMessage } from '../../api/client';
import { clearSession, isUnauthenticated, queryKeys } from '../../api/queries';
import { BottomSheet } from '../../components/BottomSheet';
import { Celebration } from '../../components/Celebration';
import { useOnline } from '../../hooks/useOnline';
import { episodeLabel } from '../../lib/episode';
import { plural } from '../../lib/format';
import { vibrate } from '../../lib/haptics';
import { revealStore } from '../../lib/reveal-store';
import { toast } from '../../lib/toast-store';
import { writeTracker } from '../../lib/write-tracker';
import { TrackingContext, type Hit, type TrackingApi } from './context';

type Item = SetWatchedBody['items'][number];

type ApplyFn = (
  items: Item[],
  watched: boolean,
  options?: { undo?: boolean; message?: string },
) => Promise<void>;

type Sheet =
  | { kind: 'previous'; target: EpisodeView; previous: EpisodeView[] }
  | { kind: 'reveal'; episode: EpisodeView }
  | { kind: 'part'; partNumber: number; action: 'watch' | 'reset'; ids: string[]; items: Item[] };

function mergeEpisodes(catalog: CatalogResponse, updates: readonly EpisodeView[]): CatalogResponse {
  const byId = new Map(updates.map((e) => [e.id, e]));
  return { ...catalog, episodes: catalog.episodes.map((e) => byId.get(e.id) ?? e) };
}

export function TrackingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const online = useOnline();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [hits, setHits] = useState<ReadonlyMap<string, Hit>>(new Map());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [celebration, setCelebration] = useState<number | null>(null);
  const nonce = useRef(0);
  /** Référence stable vers `apply`, pour que l'action « Annuler » puisse la rappeler. */
  const applyRef = useRef<ApplyFn | null>(null);

  const getCatalog = useCallback(
    () => queryClient.getQueryData<CatalogResponse>(queryKeys.catalog),
    [queryClient],
  );

  const markHits = useCallback((ids: readonly string[], watched: boolean) => {
    nonce.current += 1;
    const n = nonce.current;
    setHits((prev) => {
      const next = new Map(prev);
      for (const id of ids) next.set(id, { nonce: n, watched });
      return next;
    });
    // Les « impacts » ne servent qu'aux animations immédiates : on les oublie ensuite.
    setTimeout(() => {
      setHits((prev) => {
        const next = new Map(prev);
        for (const id of ids) if (next.get(id)?.nonce === n) next.delete(id);
        return next;
      });
    }, 1500);
  }, []);

  /** Compteur par épisode : un épisode reste « en cours » tant qu'une requête le concerne. */
  const pendingCounts = useRef(new Map<string, number>());
  const setPendingIds = useCallback((ids: readonly string[], on: boolean) => {
    const counts = pendingCounts.current;
    for (const id of ids) {
      const n = (counts.get(id) ?? 0) + (on ? 1 : -1);
      if (n > 0) counts.set(id, n);
      else counts.delete(id);
    }
    setPending(new Set(counts.keys()));
  }, []);

  const run = useCallback(
    async (
      items: Item[],
      ids: string[],
      watched: boolean,
      options: { undo?: boolean; message?: string },
    ) => {
      const before = getCatalog();
      if (!before) return;
      const idSet = new Set(ids);
      const previous = before.episodes.filter((e) => idSet.has(e.id));
      const now = new Date().toISOString();

      const optimistic = before.episodes.map((e): EpisodeView => {
        if (!idSet.has(e.id)) return e;
        if (watched) {
          const at = items.find((i) => i.episodeId === e.id)?.watchedAt;
          return { ...e, watched: true, watchedAt: e.watchedAt ?? at ?? now };
        }
        return {
          ...e,
          watched: false,
          watchedAt: null,
          ...(before.antiSpoil ? { title: null, titleHidden: true } : {}),
        };
      });
      queryClient.setQueryData<CatalogResponse>(queryKeys.catalog, {
        ...before,
        episodes: optimistic,
      });
      if (!watched) revealStore.forget(ids);
      markHits(ids, watched);
      if (watched) vibrate(ids.length > 1 ? [12, 40, 12] : 14);

      try {
        const result = await api.setWatched({ watched, items });
        const current = getCatalog();
        if (current) {
          queryClient.setQueryData<CatalogResponse>(
            queryKeys.catalog,
            mergeEpisodes(current, result.episodes),
          );
        }
        // Célébration seulement pour une vraie progression (pas pour l'annulation d'une remise à zéro),
        // et une seule à la fois.
        if (watched && !options.undo) {
          const after = getCatalog();
          const done = after
            ? justCompletedParts(before.episodes, after.episodes, before.today)
            : [];
          const last = done.at(-1);
          if (last !== undefined) {
            setTimeout(() => {
              setCelebration((current) => current ?? last);
            }, 450);
          }
        }
        if (!options.undo) {
          const newlyWatched = previous.filter((e) => !e.watched).map((e) => e.id);
          const undoItems: Item[] = watched
            ? newlyWatched.map((episodeId) => ({ episodeId }))
            : previous.flatMap((e) =>
                e.watched && e.watchedAt ? [{ episodeId: e.id, watchedAt: e.watchedAt }] : [],
              );
          const message = options.message ?? (watched ? 'Marqué comme vu !' : 'Épisode décoché.');
          toast.show({
            message,
            tone: 'success',
            ...(undoItems.length > 0
              ? {
                  action: {
                    label: 'Annuler',
                    run: () => {
                      void applyRef.current?.(undoItems, !watched, { undo: true });
                    },
                  },
                }
              : {}),
          });
        }
      } catch (error) {
        if (isUnauthenticated(error)) {
          clearSession(queryClient);
          return;
        }
        const current = getCatalog();
        if (current) {
          queryClient.setQueryData<CatalogResponse>(
            queryKeys.catalog,
            mergeEpisodes(current, previous),
          );
        }
        toast.error(errorMessage(error));
      }
    },
    [getCatalog, markHits, queryClient],
  );

  /**
   * Applique un changement de façon optimiste, puis confirme avec le serveur.
   * En cas d'échec, seuls les épisodes concernés sont restaurés (les autres actions en cours sont préservées).
   */
  const apply = useCallback(
    async (items: Item[], watched: boolean, options: { undo?: boolean; message?: string } = {}) => {
      if (items.length === 0) return;
      if (!online) {
        toast.error('Pas de réseau… impossible de cocher hors ligne.');
        return;
      }
      const ids = items.map((i) => i.episodeId);
      // Un épisode déjà en cours d'enregistrement ignore les nouveaux taps (pas de requêtes croisées).
      if (ids.some((id) => pendingCounts.current.has(id))) return;
      writeTracker.start();
      setPendingIds(ids, true);
      try {
        await queryClient.cancelQueries({ queryKey: queryKeys.catalog });
        await run(items, ids, watched, options);
      } finally {
        setPendingIds(ids, false);
        writeTracker.end();
        // Une fois toutes les écritures terminées, on se resynchronise avec le serveur.
        if (!writeTracker.busy) void queryClient.invalidateQueries({ queryKey: queryKeys.catalog });
      }
    },
    [online, queryClient, run, setPendingIds],
  );

  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  const markSeen = useCallback(
    (target: EpisodeView) => {
      const catalog = getCatalog();
      // État à jour depuis le cache (la prop peut être périmée après un double tap).
      const episode = catalog?.episodes.find((e) => e.id === target.id);
      if (!catalog || !episode || !isAired(episode, catalog.today) || episode.watched) return;
      if (pendingCounts.current.has(episode.id)) return;
      const prev = previousUnwatched(catalog.episodes, episode.id, catalog.today);
      if (prev.length > 0) {
        setSheet({ kind: 'previous', target: episode, previous: prev });
        return;
      }
      void apply([{ episodeId: episode.id }], true, { message: `${episodeLabel(episode)} : vu !` });
    },
    [apply, getCatalog],
  );

  const toggle = useCallback(
    (target: EpisodeView) => {
      const episode = getCatalog()?.episodes.find((e) => e.id === target.id) ?? target;
      if (episode.watched) {
        void apply([{ episodeId: episode.id }], false, {
          message: `${episodeLabel(episode)} décoché.`,
        });
        return;
      }
      markSeen(episode);
    },
    [apply, getCatalog, markSeen],
  );

  const requestReveal = useCallback((episode: EpisodeView) => {
    if (!episode.titleHidden) return;
    setSheet({ kind: 'reveal', episode });
  }, []);

  const requestPartAction = useCallback(
    (partNumber: number, action: 'watch' | 'reset') => {
      const catalog = getCatalog();
      if (!catalog) return;
      const inPart = catalog.episodes.filter((e) => e.partNumber === partNumber);
      const targets =
        action === 'watch'
          ? inPart.filter((e) => !e.watched && isAired(e, catalog.today))
          : inPart.filter((e) => e.watched);
      if (targets.length === 0) {
        toast.show({
          message:
            action === 'watch'
              ? 'Tous les épisodes disponibles de cette partie sont déjà vus.'
              : 'Aucun épisode vu dans cette partie.',
        });
        return;
      }
      setSheet({
        kind: 'part',
        partNumber,
        action,
        ids: targets.map((e) => e.id),
        items: targets.map((e) => ({ episodeId: e.id })),
      });
    },
    [getCatalog],
  );

  const closeSheet = useCallback(() => {
    setSheet(null);
  }, []);

  const confirmReveal = useCallback(
    async (episode: EpisodeView) => {
      setSheet(null);
      try {
        const { title } = await api.reveal(episode.id);
        revealStore.set(episode.id, title);
      } catch (error) {
        if (isUnauthenticated(error)) clearSession(queryClient);
        else toast.error(errorMessage(error));
      }
    },
    [queryClient],
  );

  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  const value = useMemo<TrackingApi>(
    () => ({ toggle, markSeen, requestReveal, requestPartAction, hits, pending }),
    [toggle, markSeen, requestReveal, requestPartAction, hits, pending],
  );

  return (
    <TrackingContext.Provider value={value}>
      {children}

      <BottomSheet
        open={sheet?.kind === 'previous'}
        onClose={closeSheet}
        kicker="ドドドド"
        title={
          sheet?.kind === 'previous'
            ? `Marquer aussi ${sheet.previous.length > 1 ? `les ${sheet.previous.length} épisodes précédents` : "l'épisode précédent"} comme vu${sheet.previous.length > 1 ? 's' : ''} ?`
            : ''
        }
      >
        {sheet?.kind === 'previous' && (
          <>
            <p className="sheet__text">
              Tu coches <strong>{episodeLabel(sheet.target)}</strong>, mais{' '}
              {plural(sheet.previous.length, 'épisode précédent', 'épisodes précédents')}{' '}
              {sheet.previous.length > 1 ? 'ne sont' : "n'est"} pas encore coché
              {sheet.previous.length > 1 ? 's' : ''}.
            </p>
            <div className="sheet__actions">
              <button
                type="button"
                className="btn btn--accent btn--block"
                onClick={() => {
                  const ids = [...sheet.previous.map((e) => e.id), sheet.target.id];
                  setSheet(null);
                  void apply(
                    ids.map((episodeId) => ({ episodeId })),
                    true,
                    { message: `${plural(ids.length, 'épisode')} marqués comme vus !` },
                  );
                }}
              >
                Oui, tout marquer
              </button>
              <button
                type="button"
                className="btn btn--paper btn--block"
                onClick={() => {
                  const target = sheet.target;
                  setSheet(null);
                  void apply([{ episodeId: target.id }], true, {
                    message: `${episodeLabel(target)} : vu !`,
                  });
                }}
              >
                Seulement celui-ci
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === 'reveal'}
        onClose={closeSheet}
        kicker="ゴゴゴゴ"
        tone="danger"
        title="Révéler le titre ?"
      >
        {sheet?.kind === 'reveal' && (
          <>
            <p className="sheet__text">
              Ça peut spoiler. Le titre de <strong>{episodeLabel(sheet.episode)}</strong> sera
              affiché jusqu’à la fermeture de l’appli, sans être enregistré.
            </p>
            <div className="sheet__actions">
              <button
                type="button"
                className="btn btn--danger btn--block"
                onClick={() => {
                  void confirmReveal(sheet.episode);
                }}
              >
                Révéler quand même
              </button>
              <button type="button" className="btn btn--paper btn--block" onClick={closeSheet}>
                Non, garder la surprise
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === 'part'}
        onClose={closeSheet}
        kicker={sheet?.kind === 'part' && sheet.action === 'reset' ? 'バーン' : 'ドン！'}
        tone={sheet?.kind === 'part' && sheet.action === 'reset' ? 'danger' : 'accent'}
        title={
          sheet?.kind === 'part'
            ? sheet.action === 'watch'
              ? `Marquer toute la partie ${sheet.partNumber} comme vue ?`
              : `Réinitialiser la partie ${sheet.partNumber} ?`
            : ''
        }
      >
        {sheet?.kind === 'part' && (
          <>
            <p className="sheet__text">
              {sheet.action === 'watch'
                ? `${plural(sheet.ids.length, 'épisode disponible', 'épisodes disponibles')} ser${sheet.ids.length > 1 ? 'ont' : 'a'} marqué${sheet.ids.length > 1 ? 's' : ''} comme vu${sheet.ids.length > 1 ? 's' : ''}, et leurs titres révélés.`
                : `${plural(sheet.ids.length, 'épisode vu', 'épisodes vus')} ser${sheet.ids.length > 1 ? 'ont' : 'a'} décoché${sheet.ids.length > 1 ? 's' : ''} et leurs titres masqués à nouveau.`}{' '}
              Tu pourras annuler juste après.
            </p>
            <div className="sheet__actions">
              <button
                type="button"
                className={`btn btn--block ${sheet.action === 'watch' ? 'btn--accent' : 'btn--danger'}`}
                onClick={() => {
                  const { action, items, partNumber } = sheet;
                  setSheet(null);
                  void apply(items, action === 'watch', {
                    message:
                      action === 'watch'
                        ? `Partie ${partNumber} marquée comme vue !`
                        : `Partie ${partNumber} réinitialisée.`,
                  });
                }}
              >
                {sheet.action === 'watch' ? 'Tout marquer comme vu' : 'Réinitialiser'}
              </button>
              <button type="button" className="btn btn--paper btn--block" onClick={closeSheet}>
                Annuler
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      <Celebration partNumber={celebration} onClose={closeCelebration} />
    </TrackingContext.Provider>
  );
}
