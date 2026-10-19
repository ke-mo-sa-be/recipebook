import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { cx } from '../../components/ui/cx.ts';
import { KITCHEN_ITEMS, type KitchenItem } from './kitchen.ts';

const TILTS = [-8, 6, -3, 7, -6, 4, -5, 8];

/** Tap the ingredients you have; "Find recipes" lists recipes that use them, most matches first. */
export function KitchenPicker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<KitchenItem[]>([]);
  const toggle = (item: KitchenItem) =>
    setPicked((p) => (p.includes(item) ? p.filter((i) => i !== item) : [...p, item]));

  return (
    <section
      aria-labelledby="kitchen-title"
      className="card flex flex-col gap-4 px-3 py-5 sm:px-5 lg:rounded-[32px] lg:p-7"
    >
      <div className="text-center">
        <h2 id="kitchen-title" className="text-h2 font-medium">
          <span className="block">{t('home.kitchen.title')}</span>
          <span className="block text-text-soft">{t('home.kitchen.titleSoft')}</span>
        </h2>
        <p className="mt-1 text-small text-text-muted">{t('home.kitchen.body')}</p>
      </div>
      <ul className="grid grid-cols-3 gap-y-3 sm:grid-cols-4 sm:gap-x-1">
        {KITCHEN_ITEMS.map((item, i) => {
          const on = picked.includes(item);
          return (
            <li key={item}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item)}
                className="group flex w-full flex-col items-center gap-1 rounded-lg py-1"
              >
                <span className="relative">
                  <Sticker
                    slug={item}
                    size={64}
                    tilt={on ? 0 : TILTS[i]}
                    className={cx('transition-[rotate,scale] duration-150', on && 'scale-110')}
                  />
                  {on && (
                    <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-pill bg-primary text-on-primary">
                      <Check aria-hidden className="size-3.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span
                  className={cx(
                    // Capped like nav labels: Malayalam names (വെളുത്തുള്ളി) must fit a third of a 360px phone at XL.
                    'text-[clamp(12px,0.82rem,14px)] leading-tight',
                    on ? 'font-semibold text-text' : 'text-text-muted',
                  )}
                >
                  {t(`ingredients.${item}`)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-small text-text-muted" aria-live="polite">
          {t('home.kitchen.picked', { count: picked.length })}
        </span>
        <Button
          disabled={picked.length === 0}
          className="min-h-[46px] px-5"
          onClick={() => navigate(`/search?with=${picked.join(',')}`)}
        >
          {t('home.kitchen.find')}
        </Button>
      </div>
    </section>
  );
}
