import { AnimatePresence, motion } from 'motion/react';
import { LockIcon } from './Icons';

interface SealProps {
  watched: boolean;
  aired: boolean;
  /** Animer l'apparition (action utilisateur récente). */
  animate: boolean;
  label: string;
  busy: boolean;
  onPress: () => void;
}

/** Sceau façon tampon de manga : vide = à voir, « VU » écrasé = vu. */
export function Seal({ watched, aired, animate, label, busy, onPress }: SealProps) {
  if (!aired) {
    return (
      <span className="seal seal--locked" role="img" aria-label={label}>
        <LockIcon size={20} />
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`seal ${watched ? 'seal--on' : ''}`}
      aria-pressed={watched}
      aria-label={label}
      aria-busy={busy}
      onClick={onPress}
    >
      <span className="seal__ring" aria-hidden="true" />
      <AnimatePresence initial={false}>
        {watched && (
          <motion.span
            key="stamp"
            className="seal__stamp"
            aria-hidden="true"
            initial={animate ? { scale: 2.6, rotate: -48, opacity: 0 } : false}
            animate={{ scale: 1, rotate: -14, opacity: 1 }}
            exit={{ scale: 0.4, rotate: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 900, damping: 30, mass: 0.7 }}
          >
            VU
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
