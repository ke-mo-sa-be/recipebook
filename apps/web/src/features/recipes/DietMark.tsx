import { useTranslation } from 'react-i18next';
import type { Diet } from './api.ts';

const COLOR: Record<Diet, string> = {
  veg: 'text-diet-veg',
  vegan: 'text-diet-veg',
  egg: 'text-diet-egg',
  nonveg: 'text-diet-nonveg',
};

/** Indian food-label style marker: a square with a dot (veg) or triangle (non-veg), always with a word. */
export function DietMark({ diet, showLabel = false }: { diet: Diet; showLabel?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1 ${COLOR[diet]}`} title={t(`diet.${diet}`)}>
      <svg aria-hidden viewBox="0 0 16 16" className="size-4">
        <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        {diet === 'nonveg' ? (
          <path d="M8 4.2 11.6 11H4.4Z" fill="currentColor" />
        ) : (
          <circle cx="8" cy="8" r="3.2" fill="currentColor" />
        )}
      </svg>
      <span className={showLabel ? 'text-small font-medium' : 'sr-only'}>{t(`diet.${diet}`)}</span>
    </span>
  );
}
