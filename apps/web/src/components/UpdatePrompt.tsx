import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '../lib/toast-store';

/**
 * Mise à jour maîtrisée : quand un nouveau service worker attend, on propose de recharger
 * via un toast persistant (jamais de rechargement forcé en pleine action).
 */
export function UpdatePrompt() {
  const shown = useRef<number | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Vérifie périodiquement la présence d'une nouvelle version (toutes les heures).
      setInterval(
        () => {
          void registration.update();
        },
        60 * 60 * 1000,
      );
    },
  });

  useEffect(() => {
    if (!needRefresh || shown.current !== null) return;
    shown.current = toast.show({
      message: 'Nouvelle version disponible !',
      duration: null,
      action: {
        label: 'Recharger',
        run: () => {
          void updateServiceWorker(true);
        },
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
