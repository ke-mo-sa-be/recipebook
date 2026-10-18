import type { TFunction } from 'i18next';

/** "10 min", "1 h 30 min", "45 s" — for timer chips. */
export function durationText(t: TFunction, seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [
    h ? t('time.h', { count: h }) : '',
    m ? t('time.min', { count: m }) : '',
    !h && !m ? t('time.s', { count: s }) : '',
  ];
  return parts.filter(Boolean).join(' ');
}
