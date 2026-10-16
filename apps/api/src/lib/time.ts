/** Date calendaire (AAAA-MM-JJ) dans le fuseau donné. */
export function calendarDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const DAY_MS = 24 * 60 * 60 * 1000;
