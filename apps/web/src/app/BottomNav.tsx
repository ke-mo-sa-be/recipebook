import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cx } from '../components/ui/cx.ts';
import { NAV_ITEMS } from './nav.ts';

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex min-h-(--rb-size-bottom-nav)">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon, primary }) => (
          <li key={to} className="flex min-w-min flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  // Slots share spare width evenly but never shrink below their longest word (min-w-min on the <li>),
                  // because Malayalam labels differ a lot in length (ഹോം vs പ്രൊഫൈൽ). The label size is capped
                  // so all five fit side by side on a 360px phone at any text-size setting. Icon sizes are in px
                  // (not rem) for the same reason: the bar is fixed chrome and must not grow with the text size.
                  'flex flex-1 flex-col items-center justify-start gap-0.5 px-0.5 py-1.5 text-center text-[clamp(12px,0.78rem,13px)] leading-tight font-semibold',
                  isActive ? 'text-primary' : 'text-text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {primary ? (
                    <span className="-mt-6 flex size-[56px] shrink-0 items-center justify-center rounded-pill bg-primary text-on-primary shadow-lg">
                      <Icon aria-hidden className="size-[32px]" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span
                      className={cx(
                        'flex h-[32px] w-[48px] items-center justify-center rounded-pill',
                        isActive && 'bg-primary-soft',
                      )}
                    >
                      <Icon aria-hidden className="size-[28px]" />
                    </span>
                  )}
                  <span>{t(labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
