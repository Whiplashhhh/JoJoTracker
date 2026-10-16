import type { PartStatus } from '@jojo/shared/client';

export const STATUS_LABELS: Record<PartStatus, string> = {
  'not-started': 'À commencer',
  'in-progress': 'En cours',
  'up-to-date': 'À jour',
  completed: 'Terminée',
};
