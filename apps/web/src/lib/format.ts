const dayMonth = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});
const fullDate = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});
const localDate = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const longDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** « 23/10 » à partir d'une date calendaire ISO. */
export function formatDayMonth(isoDate: string): string {
  return dayMonth.format(new Date(`${isoDate}T00:00:00Z`));
}

/** « 05/07/2014 » à partir d'une date calendaire ISO. */
export function formatAirDate(isoDate: string): string {
  return fullDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/** Date locale d'un horodatage (« 16/10/2026 »). */
export function formatWatchedAt(iso: string): string {
  return localDate.format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return longDate.format(new Date(iso));
}

/** Nombre de jours entre deux dates calendaires ISO. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000,
  );
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}
