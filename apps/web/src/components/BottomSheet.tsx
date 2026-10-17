import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Petit sur-titre façon onomatopée. */
  kicker?: string;
  children: ReactNode;
  /** Couleur de bandeau : accent (défaut) ou alerte. */
  tone?: 'accent' | 'danger';
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SheetPanelProps {
  panelRef: RefObject<HTMLDivElement | null>;
  titleId: string;
  tone: 'accent' | 'danger';
  title: string;
  kicker: string | undefined;
  children: ReactNode;
}

/** Panneau de la feuille ; inerte pendant son animation de sortie (pas de double action). */
function SheetPanel({ panelRef, titleId, tone, title, kicker, children }: SheetPanelProps) {
  const present = useIsPresent();
  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`sheet sheet--${tone}`}
      inert={!present}
      initial={{ y: '105%' }}
      animate={{ y: 0 }}
      exit={{ y: '105%' }}
      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
    >
      <div className="sheet__grip" aria-hidden="true" />
      {kicker && (
        <p className="sheet__kicker" aria-hidden="true">
          {kicker}
        </p>
      )}
      <h2 id={titleId} className="sheet__title">
        {title}
      </h2>
      <div className="sheet__body">{children}</div>
    </motion.div>
  );
}

/** Feuille modale ancrée en bas (zone du pouce), accessible (focus piégé, Échap). */
export function BottomSheet({
  open,
  onClose,
  title,
  kicker,
  children,
  tone = 'accent',
}: BottomSheetProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  // Référence stable : l'effet ne doit pas se rejouer à chaque rendu du parent
  // (sinon le focus saute et le clavier iOS se ferme pendant la saisie).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = items[0];
        const last = items.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('sheet-open');
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('sheet-open');
      restore.current?.focus();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-layer">
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <SheetPanel panelRef={panel} titleId={titleId} tone={tone} title={title} kicker={kicker}>
            {children}
          </SheetPanel>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
