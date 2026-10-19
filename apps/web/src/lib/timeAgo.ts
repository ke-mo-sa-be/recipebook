import type { Lang } from '@recipebook/core';

const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 hours ago" / "2 മണിക്കൂർ മുമ്പ്"; anything under a minute is "now". */
export function timeAgo(iso: string, lang: Lang, now = Date.now()): string {
  const fmt = new Intl.RelativeTimeFormat(lang === 'ml' ? 'ml-IN' : 'en-IN', { numeric: 'auto' });
  const secs = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of STEPS) {
    if (Math.abs(secs) >= size) return fmt.format(Math.round(secs / size), unit);
  }
  return fmt.format(0, 'second');
}
