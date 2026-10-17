import { AnimatePresence, motion } from 'motion/react';
import { toast, usePausedToasts, useToasts } from '../lib/toast-store';
import { CloseIcon } from './Icons';

export function Toaster() {
  const toasts = useToasts();
  const paused = usePausedToasts();
  return (
    <div className="toaster" role="region" aria-label="Notifications">
      <div aria-live="polite" aria-atomic="false" className="toaster__stack">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast toast--${t.tone} ${paused.has(t.id) ? 'toast--paused' : ''}`}
              onMouseEnter={() => {
                toast.pause(t.id);
              }}
              onMouseLeave={() => {
                toast.resume(t.id);
              }}
              onFocus={() => {
                toast.pause(t.id);
              }}
              onBlur={() => {
                toast.resume(t.id);
              }}
              initial={{ opacity: 0, y: 24, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', stiffness: 600, damping: 38 }}
            >
              <p className="toast__message">{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    toast.dismiss(t.id);
                    t.action?.run();
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast__close"
                aria-label="Fermer la notification"
                onClick={() => {
                  toast.dismiss(t.id);
                }}
              >
                <CloseIcon size={18} />
              </button>
              {t.duration !== null && (
                <span
                  className="toast__timer"
                  aria-hidden="true"
                  style={{ animationDuration: `${t.duration}ms` }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
