import { isAired, type EpisodeView } from '@jojo/shared/client';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { memo, useEffect, useRef } from 'react';
import type { Hit } from '../features/tracking/context';
import { useLongPress } from '../hooks/useLongPress';
import { formatAirDate, formatDayMonth, formatWatchedAt } from '../lib/format';
import { useRevealedTitle } from '../lib/reveal-store';
import { CensorBar } from './CensorBar';
import { EyeIcon } from './Icons';
import { Seal } from './Seal';

interface EpisodeRowProps {
  episode: EpisodeView;
  today: string;
  hit: Hit | undefined;
  busy: boolean;
  onToggle: (episode: EpisodeView) => void;
  onReveal: (episode: EpisodeView) => void;
}

function EpisodeRowImpl({ episode, today, hit, busy, onToggle, onReveal }: EpisodeRowProps) {
  const aired = isAired(episode, today);
  const revealed = useRevealedTitle(episode.id);
  const reduce = useReducedMotion() ?? false;
  const [scope, animate] = useAnimate<HTMLLIElement>();
  const lastNonce = useRef(hit?.nonce);
  const animateStamp = hit?.watched === true;
  // L'impact (« ドン！ » + onde de trame) vit tant que l'action est récente (cf. TrackingProvider).
  const burst = hit?.watched && !reduce ? hit.nonce : null;

  const longPress = useLongPress(() => {
    if (episode.titleHidden && revealed === undefined) onReveal(episode);
  });

  useEffect(() => {
    if (!hit || hit.nonce === lastNonce.current) return;
    lastNonce.current = hit.nonce;
    if (!hit.watched || reduce) return;
    void animate(
      scope.current,
      { x: [0, -7, 6, -4, 2, 0], rotate: [0, -0.6, 0.5, 0] },
      { duration: 0.34 },
    );
  }, [hit, reduce, animate, scope]);

  const n = episode.numberInPart;
  const state = !aired ? 'unaired' : episode.watched ? 'watched' : 'unwatched';
  const sealLabel = !aired
    ? `Épisode ${n} pas encore disponible`
    : episode.watched
      ? `Épisode ${n} vu. Toucher pour décocher`
      : `Marquer l’épisode ${n} comme vu`;

  const showTitle = !episode.titleHidden || revealed !== undefined;
  const titleText = !episode.titleHidden ? episode.title : (revealed ?? null);

  return (
    <motion.li
      ref={scope}
      className={`ep ep--${state}`}
      data-episode={episode.id}
      {...(episode.titleHidden && revealed === undefined ? longPress.handlers : {})}
    >
      <div className="ep__num" aria-hidden="true">
        <span>{n}</span>
      </div>
      <div className="ep__main">
        <p className="ep__label">
          <span>Épisode {n}</span>
          {episode.officialNumber !== n && (
            <span className="ep__official">n° officiel {episode.officialNumber}</span>
          )}
        </p>
        <div className="ep__title-zone">
          <AnimatePresence mode="popLayout" initial={false}>
            {showTitle ? (
              <motion.p
                key="title"
                className={`ep__title ${titleText === null ? 'ep__title--unknown' : ''}`}
                initial={{ opacity: 0, x: reduce ? 0 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduce ? 0 : 0.12, duration: 0.3 }}
              >
                {titleText ?? 'Titre inconnu'}
                {episode.titleHidden && revealed !== undefined && (
                  <span className="ep__revealed">
                    <EyeIcon size={14} /> révélé
                  </span>
                )}
              </motion.p>
            ) : (
              <motion.div
                key="censor"
                className="ep__censor-wrap"
                initial={{ scaleX: reduce ? 1 : 0, opacity: reduce ? 0 : 1 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scaleX: 0, opacity: 0.6 }}
                transition={{ duration: reduce ? 0.15 : 0.32, ease: [0.7, 0, 0.3, 1] }}
                style={{ originX: 1 }}
              >
                <CensorBar
                  episodeId={episode.id}
                  episodeNumber={n}
                  onReveal={() => {
                    if (!longPress.consumedLongPress()) onReveal(episode);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="ep__meta">
          {!aired && episode.airDate ? (
            <span className="ep__soon">Disponible le {formatDayMonth(episode.airDate)}</span>
          ) : episode.watched && episode.watchedAt ? (
            <span>Vu le {formatWatchedAt(episode.watchedAt)}</span>
          ) : episode.airDate ? (
            <span>Diffusé le {formatAirDate(episode.airDate)}</span>
          ) : null}
        </p>
      </div>
      <div className="ep__seal">
        <Seal
          watched={episode.watched}
          aired={aired}
          animate={animateStamp}
          busy={busy}
          label={sealLabel}
          onPress={() => {
            onToggle(episode);
          }}
        />
        {burst !== null && (
          <>
            <span key={`burst-${burst}`} className="burst" aria-hidden="true">
              ドン！
            </span>
            <span key={`ripple-${burst}`} className="ripple" aria-hidden="true" />
          </>
        )}
      </div>
    </motion.li>
  );
}

export const EpisodeRow = memo(EpisodeRowImpl);
