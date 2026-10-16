import { nextStep, type CatalogResponse } from '@jojo/shared/client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTracking } from '../features/tracking/context';
import { seasonName } from '../lib/episode';
import { daysBetween, formatDayMonth, plural } from '../lib/format';
import { CensorBar } from './CensorBar';
import { Onomatopoeia } from './Onomatopoeia';

const GLYPHS = [
  { text: 'ゴ', x: 78, y: 4, size: 44, rotate: 12 },
  { text: 'ゴ', x: 88, y: 26, size: 34, rotate: 18 },
  { text: 'ゴ', x: 82, y: 50, size: 26, rotate: 8 },
  { text: 'ゴ', x: 4, y: 72, size: 30, rotate: -14 },
  { text: 'ゴ', x: 12, y: 88, size: 22, rotate: -6 },
] as const;

/** Carte « Reprendre » : la prochaine étape, sans titre, et un gros bouton pour la cocher. */
export function ResumeCard({
  catalog,
  highlight,
}: {
  catalog: CatalogResponse;
  highlight: boolean;
}) {
  const { markSeen, pending } = useTracking();
  const reduce = useReducedMotion() ?? false;
  const [justSeen, setJustSeen] = useState<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!highlight) return;
    section.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    button.current?.focus({ preventScroll: true });
  }, [highlight, reduce]);

  const seenEpisode = justSeen ? catalog.episodes.find((e) => e.id === justSeen) : undefined;
  useEffect(() => {
    if (!justSeen) return;
    const timer = setTimeout(() => {
      setJustSeen(null);
    }, 3200);
    return () => {
      clearTimeout(timer);
    };
  }, [justSeen]);

  const step = nextStep(catalog.episodes, catalog.today);
  const showSeen = seenEpisode?.watched === true && !pending.has(seenEpisode.id);

  let content;
  if (showSeen) {
    content = (
      <motion.div
        key={`seen-${seenEpisode.id}`}
        className="resume__body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <p className="resume__part">Partie {seenEpisode.partNumber}</p>
        <h2 className="resume__ep" id="resume-title">
          Épisode {seenEpisode.numberInPart}
        </h2>
        <motion.p
          className="resume__title"
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {seenEpisode.title ?? 'Titre inconnu'}
        </motion.p>
        <motion.span
          className="resume__stamp"
          aria-hidden="true"
          initial={reduce ? { opacity: 0 } : { scale: 2.6, rotate: -40, opacity: 0 }}
          animate={{ scale: 1, rotate: -12, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 700, damping: 26 }}
        >
          VU !
        </motion.span>
        <button
          type="button"
          className="btn btn--paper btn--block"
          onClick={() => {
            setJustSeen(null);
          }}
        >
          Épisode suivant
        </button>
      </motion.div>
    );
  } else if (step.kind === 'episode') {
    const ep = step.episode;
    const part = catalog.parts.find((p) => p.number === ep.partNumber);
    const season = seasonName(part, ep.season);
    content = (
      <motion.div
        key={ep.id}
        className="resume__body"
        initial={{ opacity: 0, x: reduce ? 0 : 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: reduce ? 0 : -30 }}
        transition={{ duration: 0.25 }}
      >
        <p className="resume__part">
          Partie {ep.partNumber}
          {part && <span> · {part.name}</span>}
        </p>
        <h2 className="resume__ep" id="resume-title">
          Épisode {ep.numberInPart}
        </h2>
        {season && <p className="resume__season">{season}</p>}
        <div className="resume__censor">
          <CensorBar episodeId={ep.id} episodeNumber={ep.numberInPart} />
        </div>
        <button
          ref={button}
          type="button"
          className="btn btn--yellow btn--xl btn--block resume__cta"
          onClick={() => {
            setJustSeen(ep.id);
            markSeen(ep);
          }}
        >
          Je l’ai vu !
        </button>
        <Link className="resume__link" to={`/parties/${ep.partNumber}#${ep.id}`}>
          Voir la partie {ep.partNumber} →
        </Link>
      </motion.div>
    );
  } else if (step.kind === 'upcoming') {
    const ep = step.episode;
    const days = ep.airDate ? daysBetween(catalog.today, ep.airDate) : null;
    content = (
      <motion.div
        key={`up-${ep.id}`}
        className="resume__body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="resume__part">Tu es à jour !</p>
        <h2 className="resume__ep" id="resume-title">
          Partie {ep.partNumber} · Épisode {ep.numberInPart}
        </h2>
        <p className="resume__season">
          {ep.airDate
            ? `Disponible le ${formatDayMonth(ep.airDate)}${days !== null && days > 0 ? ` · dans ${plural(days, 'jour')}` : ''}`
            : 'Date de diffusion à venir'}
        </p>
        <div className="resume__censor">
          <CensorBar episodeId={ep.id} episodeNumber={ep.numberInPart} />
        </div>
      </motion.div>
    );
  } else {
    content = (
      <motion.div
        key="done"
        className="resume__body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="resume__part">Incroyable…</p>
        <h2 className="resume__ep" id="resume-title">
          Tout est vu !
        </h2>
        <p className="resume__season">Chaque épisode a reçu son tampon. Bravo.</p>
      </motion.div>
    );
  }

  return (
    <section
      ref={section}
      id="reprendre"
      className={`resume ${highlight ? 'resume--highlight' : ''}`}
      aria-labelledby="resume-title"
    >
      <Onomatopoeia glyphs={GLYPHS} tone="accent" className="onoma--menace" />
      <p className="resume__tag">Reprendre</p>
      <AnimatePresence mode="wait" initial={false}>
        {content}
      </AnimatePresence>
    </section>
  );
}
