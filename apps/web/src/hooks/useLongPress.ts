import { useCallback, useRef, type PointerEvent } from 'react';

/** Appui long tactile/souris (≈ 550 ms), annulé si le doigt bouge (défilement). */
export function useLongPress(onLongPress: () => void, delay = 550) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.button !== 0) return;
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, delay);
    },
    [delay, onLongPress],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const o = origin.current;
      if (o && Math.hypot(event.clientX - o.x, event.clientY - o.y) > 10) clear();
    },
    [clear],
  );

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (event: { preventDefault: () => void }) => {
        event.preventDefault();
      },
    },
    /** Vrai si le dernier geste était un appui long (pour ignorer le clic qui suit). */
    consumedLongPress: () => {
      const value = fired.current;
      fired.current = false;
      return value;
    },
  };
}
