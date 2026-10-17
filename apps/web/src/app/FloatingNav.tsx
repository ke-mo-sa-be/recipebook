import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cx } from '../components/ui/cx.ts';
import { NAV_ITEMS } from './nav.ts';

/** v2 mobile/tablet navigation: a floating white pill with a raised black "+" in the centre. */
export function FloatingNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-3.5 bottom-[calc(14px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[520px] rounded-pill bg-surface shadow-lg lg:hidden"
    >
      <ul className="flex min-h-[70px] items-stretch px-1.5">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon, primary }) => (
          <li key={to} className="flex min-w-min flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  // Fixed chrome: px sizes and a capped label size so all five labels fit whole on a
                  // 360px phone at any text-size setting (checked by e2e/layout.spec.ts).
                  'flex flex-1 flex-col items-center justify-center gap-[3px] px-0.5 text-center text-[clamp(11px,0.72rem,12px)] leading-tight font-semibold',
                  isActive ? 'text-text' : 'text-text-muted',
                )
              }
            >
              {primary ? (
                <span className="-mt-[22px] flex size-[54px] shrink-0 items-center justify-center rounded-pill bg-primary text-on-primary shadow-md">
                  <Icon aria-hidden className="size-[26px]" strokeWidth={2.4} />
                </span>
              ) : (
                <Icon aria-hidden className="size-[23px]" />
              )}
              <span>{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
