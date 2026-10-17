import { Link, NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { brand } from '../brand/brand.ts';
import { currentLang } from '../i18n/index.ts';
import { buttonClass } from '../components/ui/Button.tsx';
import { cx } from '../components/ui/cx.ts';
import { NAV_ITEMS } from './nav.ts';

export function TopNav() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 hidden border-b-2 border-border bg-surface md:block">
      <nav
        aria-label={t('nav.main')}
        className="mx-auto flex h-16 max-w-(--rb-size-content-max) items-center gap-2 px-6"
      >
        <Link to="/" className="mr-4 flex min-h-tap items-center gap-2 text-h3">
          <img src={brand.logo} alt="" className="size-9" />
          <span>{brand.name[currentLang()]}</span>
        </Link>
        <ul className="flex flex-1 items-center gap-1">
          {NAV_ITEMS.filter((i) => !i.primary).map(({ to, labelKey, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-tap items-center gap-2 rounded-pill px-4 font-semibold',
                    isActive ? 'bg-primary-soft text-on-primary-soft' : 'text-text hover:bg-surface-sunken',
                  )
                }
              >
                <Icon aria-hidden className="size-5" />
                <span>{t(labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <Link to="/add" className={buttonClass('primary')}>
          {t('nav.addRecipe')}
        </Link>
      </nav>
    </header>
  );
}
