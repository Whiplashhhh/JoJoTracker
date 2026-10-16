import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useCatalog } from '../api/queries';
import { vibrate } from '../lib/haptics';

interface CelebrationProps {
  partNumber: number | null;
  onClose: () => void;
}

/** Flèche « TO BE CONTINUED » originale (aucun asset officiel). */
function TbcArrow() {
  return (
    <svg className="tbc__svg" viewBox="0 0 640 120" role="img" aria-label="To be continued">
      <defs>
        <pattern
          id="tbc-lines"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-30)"
        >
          <rect width="3" height="8" fill="#000" opacity="0.18" />
        </pattern>
      </defs>
      <g transform="skewX(-10) translate(14 0)">
        <path
          d="M6 60 L86 6 L86 30 L626 30 L626 90 L86 90 L86 114 Z"
          fill="#0E0B10"
          transform="translate(8 6)"
        />
        <path
          d="M6 60 L86 6 L86 30 L626 30 L626 90 L86 90 L86 114 Z"
          fill="#5A3E1B"
          stroke="#F3EAD3"
          strokeWidth="5"
          strokeLinejoin="miter"
        />
        <path d="M6 60 L86 6 L86 30 L626 30 L626 90 L86 90 L86 114 Z" fill="url(#tbc-lines)" />
        <path d="M100 42 H612 M100 78 H612" stroke="#F3EAD3" strokeWidth="2" opacity="0.5" />
        <text
          x="360"
          y="76"
          textAnchor="middle"
          fill="#F3EAD3"
          fontFamily="Anton, Impact, sans-serif"
          fontSize="44"
          letterSpacing="5"
        >
          TO BE CONTINUED
        </text>
      </g>
    </svg>
  );
}

/** Célébration de fin de partie : arrêt sur image sépia + flèche qui glisse depuis la droite. */
export function Celebration({ partNumber, onClose }: CelebrationProps) {
  const catalog = useCatalog(partNumber !== null);
  const reduce = useReducedMotion() ?? false;
  const closeButton = useRef<HTMLButtonElement>(null);
  const part = catalog.data?.parts.find((p) => p.number === partNumber);

  useEffect(() => {
    if (partNumber === null) return;
    document.documentElement.classList.add('frozen');
    vibrate([30, 60, 30, 60, 120]);
    const focus = setTimeout(() => closeButton.current?.focus(), 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focus);
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('frozen');
    };
  }, [partNumber, onClose]);

  return (
    <AnimatePresence>
      {partNumber !== null && (
        <motion.div
          className="celebration"
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebration-title"
          initial={{ opacity: reduce ? 0 : 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="celebration__sepia"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0.2 : 0.12 }}
          />
          {!reduce && (
            <motion.div
              className="celebration__flash"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          )}
          <motion.div
            className="celebration__lines"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6 }}
            animate={reduce ? { opacity: 0.5 } : { opacity: 0.55, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <div className="celebration__vignette" />
          <div className="celebration__content">
            <motion.p
              className="celebration__kicker"
              aria-hidden="true"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: -20 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -8 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 380, damping: 14 }}
            >
              バーン
            </motion.p>
            <motion.h2
              id="celebration-title"
              className="celebration__title"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduce ? 0.1 : 0.35, duration: 0.3, ease: [0.2, 0.9, 0.3, 1.2] }}
            >
              <span className="celebration__part">Partie {partNumber}</span>
              <span className="celebration__done">terminée !</span>
            </motion.h2>
            {part && (
              <motion.p
                className="celebration__name"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0.15 : 0.6 }}
              >
                {part.name}
              </motion.p>
            )}
          </div>
          <motion.div
            className="tbc"
            initial={reduce ? { opacity: 0 } : { x: '115vw' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            transition={
              reduce
                ? { delay: 0.2, duration: 0.3 }
                : { delay: 0.85, duration: 0.6, ease: [0.16, 0.84, 0.3, 1.04] }
            }
          >
            <TbcArrow />
          </motion.div>
          <motion.button
            ref={closeButton}
            type="button"
            className="celebration__close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0.3 : 1.5 }}
            onClick={onClose}
          >
            Toucher pour continuer
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
