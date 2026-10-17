import { Link, NavLink, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bookmark, Home, Plus, Search } from 'lucide-react';
import { brand } from '../brand/brand.ts';
import { currentLang } from '../i18n/index.ts';
import { buttonClass } from '../components/ui/Button.tsx';
import { Avatar } from '../components/ui/Avatar.tsx';
import { Sticker } from '../components/ui/Sticker.tsx';
import { cx } from '../components/ui/cx.ts';
import { useAuth } from '../features/auth/AuthProvider.tsx';
import { useMyProfile } from '../features/profile/api.ts';

/** v2 desktop navigation (≥1024px): brand · search · Home / Saved · Add recipe · avatar. */
export function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const profile = useMyProfile();
  const pill = ({ isActive }: { isActive: boolean }) =>
    cx(
      'flex min-h-[42px] items-center gap-2 rounded-pill px-4 font-medium [&>svg]:size-5',
      isActive ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
    );

  return (
    <header className="sticky top-0 z-40 hidden bg-bg/85 backdrop-blur-md lg:block">
      <nav
        aria-label={t('nav.main')}
        className="mx-auto flex h-[76px] max-w-(--rb-size-content-max) items-center gap-4 px-10"
      >
        <Link to="/" className="flex min-h-tap items-center gap-2.5 text-h3 font-semibold">
          <Sticker slug="cooking" size={34} />
          <span>{brand.name[currentLang()]}</span>
        </Link>
        <form
          role="search"
          className="mx-auto flex h-[50px] w-full max-w-[540px] items-center gap-2.5 rounded-pill bg-surface pr-1.5 pl-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
            navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
          }}
        >
          <Search aria-hidden className="size-5 text-text-muted" />
          <label htmlFor="top-q" className="sr-only">
            {t('search.placeholder')}
          </label>
          <input
            id="top-q"
            name="q"
            type="search"
            autoComplete="off"
            placeholder={t('search.placeholder')}
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-muted"
          />
          <button
            type="submit"
            aria-label={t('nav.search')}
            title={t('nav.search')}
            className="inline-flex size-[38px] items-center justify-center rounded-pill bg-primary text-on-primary"
          >
            <Search aria-hidden className="size-4" />
          </button>
        </form>
        <ul className="flex items-center gap-1">
          <li>
            <NavLink to="/" end className={pill}>
              <Home aria-hidden />
              <span>{t('nav.home')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/saved" className={pill}>
              <Bookmark aria-hidden />
              <span>{t('nav.saved')}</span>
            </NavLink>
          </li>
        </ul>
        <Link to="/add" className={cx(buttonClass('primary'), 'min-h-[44px] px-5 whitespace-nowrap')}>
          <Plus aria-hidden />
          <span>{t('nav.addRecipe')}</span>
        </Link>
        {session ? (
          <Link to="/me" aria-label={t('nav.profile')} title={t('nav.profile')} className="rounded-pill">
            <Avatar name={profile.data?.display_name ?? '?'} />
          </Link>
        ) : (
          <Link
            to="/auth/sign-in"
            className={cx(buttonClass('secondary'), 'min-h-[44px] px-5 whitespace-nowrap')}
          >
            {t('auth.signIn.title')}
          </Link>
        )}
      </nav>
    </header>
  );
}
