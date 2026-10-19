import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Camera, Settings, UserRound } from 'lucide-react';
import { Headline } from '../../components/ui/Headline.tsx';
import { Composer } from '../../components/ui/Composer.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { EmptyState } from '../../components/ui/States.tsx';
import { IconLink } from '../../components/ui/IconButton.tsx';
import { HomeNotice } from './HomeNotice.tsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.tsx';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useMyProfile } from '../profile/api.ts';
import { KitchenPicker } from './KitchenPicker.tsx';
import { CategorySection, FeaturedSection, QuickSection } from './HomeSections.tsx';
import { useLatestRecipes } from '../recipes/api.ts';
import { RecipeCard } from '../recipes/RecipeCard.tsx';

// Quick picks are real filters, not text searches.
const QUICK = {
  quick: '/search?time=15',
  breakfast: '/c/breakfast',
  onam: '/search?tag=onam',
  snacks: '/search?tag=tea-time',
} as const;

function greetingKey(hour = new Date().getHours()) {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 17) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const profile = useMyProfile();
  const name = profile.data?.display_name;
  const latest = useLatestRecipes();
  const search = (q: string) => navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');

  return (
    <div className="flex flex-col gap-6">
      {/* Phone/tablet top row; desktop has the top bar instead. */}
      <div className="flex items-center justify-between lg:hidden">
        <IconLink to="/settings" label={t('nav.settings')} icon={<Settings aria-hidden />} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <Link to="/me" aria-label={t('nav.profile')} className="rounded-pill">
              <Avatar name={name ?? '?'} path={profile.data?.avatar_path} />
            </Link>
          ) : (
            <IconLink to="/me" label={t('nav.profile')} icon={<UserRound aria-hidden />} />
          )}
        </div>
      </div>

      <HomeNotice />

      {/* minmax(0,…): without it the chip row's natural width stretches the column past the screen. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10">
        <div className="flex flex-col gap-5">
          <Headline size="display" soft={t('home.question')}>
            {name ? t(greetingKey(), { name }) : t('home.welcome')}
          </Headline>
          <p className="hidden max-w-[46ch] text-lead text-text-muted lg:block">{t('home.pitch')}</p>
          <Composer
            className="lg:hidden"
            label={t('search.placeholder')}
            placeholder={t('search.placeholder')}
            submitLabel={t('nav.search')}
            onSubmit={search}
            extra={
              <button
                type="button"
                disabled
                className="inline-flex min-h-[40px] items-center gap-2 rounded-pill bg-surface-sunken px-3.5 text-small font-medium text-text disabled:cursor-not-allowed"
              >
                <Camera aria-hidden className="size-[18px]" />
                {t('home.scan')}
                <span className="rounded-pill bg-accent-soft px-1.5 text-[10px] font-bold tracking-wide text-on-accent-soft uppercase">
                  {t('badge.soon')}
                </span>
              </button>
            }
          />
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {(Object.keys(QUICK) as Array<keyof typeof QUICK>).map((k) => (
              <Chip key={k} to={QUICK[k]}>
                {t(`home.chips.${k}`)}
              </Chip>
            ))}
          </div>
        </div>
        <KitchenPicker />
      </div>

      <FeaturedSection />
      <QuickSection />
      <CategorySection />

      {latest.data && latest.data.length > 0 ? (
        <section aria-labelledby="latest-h" className="flex flex-col gap-3">
          <h2 id="latest-h" className="text-h2">
            {t('home.latest')}
          </h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {latest.data.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          stickers={['pancakes', 'curry-rice', 'steaming-bowl']}
          title={t('home.soon.title')}
          body={t('home.soon.body')}
        />
      )}
    </div>
  );
}
