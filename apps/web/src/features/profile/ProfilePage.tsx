import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Settings } from 'lucide-react';
import { buttonClass } from '../../components/ui/Button.tsx';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Headline } from '../../components/ui/Headline.tsx';
import { IconButton, IconLink } from '../../components/ui/IconButton.tsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { useUserId } from '../auth/AuthProvider.tsx';
import { useProfileByHandle } from './api.ts';
import { useRecipesByAuthor } from '../recipes/api.ts';
import { RecipeCard } from '../recipes/RecipeCard.tsx';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';

const TABS = ['recipes', 'variations', 'cooked', 'drafts'] as const;
type Tab = (typeof TABS)[number];
const EMPTY_STICKERS: Record<Tab, string[]> = {
  recipes: ['cooking', 'curry-rice', 'pancakes'],
  variations: ['shrimp', 'fish'],
  cooked: ['camera', 'steaming-bowl'],
  drafts: ['kitchen-knife', 'cooking'],
};

/** "Ammini's cookbook." Public profile; your own adds Edit profile and Settings. */
export function ProfilePage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUserId();
  const query = useProfileByHandle(handle);
  const [tab, setTab] = useState<Tab>('recipes');
  const published = useRecipesByAuthor(query.data?.id, 'published');
  const drafts = useRecipesByAuthor(query.data && query.data.id === uid ? uid : undefined, 'draft');

  if (query.isPending) return <Skeleton className="h-48 w-full" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const p = query.data;
  if (!p) return <NotFoundPage />;
  const isMe = p.id === uid;
  // Variations and cooked-it posts arrive in M4.
  const counts: Record<Tab, number> = {
    recipes: published.data?.length ?? 0,
    variations: 0,
    cooked: 0,
    drafts: drafts.data?.length ?? 0,
  };
  const tabs = TABS.filter((k) => k !== 'drafts' || isMe);
  const list = tab === 'recipes' ? published.data : tab === 'drafts' ? drafts.data : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        {isMe ? (
          <Avatar name={p.display_name} path={p.avatar_path} />
        ) : (
          <IconButton
            label={t('actions.back')}
            icon={<ChevronLeft aria-hidden />}
            onClick={() => navigate(-1)}
          />
        )}
        {isMe && <IconLink to="/settings" label={t('nav.settings')} icon={<Settings aria-hidden />} />}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <span className="hidden shrink-0 lg:block">
            <Avatar name={p.display_name} path={p.avatar_path} size={88} />
          </span>
          <div className="min-w-0">
            <Headline
              size="display"
              soft={
                counts.recipes
                  ? t('profile.cookbookCounts', { recipes: counts.recipes, variations: counts.variations })
                  : t('profile.cookbookEmpty')
              }
            >
              {t('profile.cookbookTitle', { name: p.display_name })}
            </Headline>
            <p className="mt-2 text-small text-text-muted">
              @{p.handle}
              {p.district && ` · ${t(`districts.${p.district}`)}`}
              {p.bio && ` · ${p.bio}`}
            </p>
          </div>
        </div>
        {isMe && (
          <Link to="/settings#profile" className={buttonClass('secondary')}>
            {t('profile.edit')}
          </Link>
        )}
      </div>

      {p.status === 'suspended' && (
        <p className="rounded-lg bg-warning-soft p-3 text-on-warning-soft">{t('profile.suspended')}</p>
      )}

      <div
        role="tablist"
        aria-label={t('profile.tabsLabel')}
        // Wraps instead of scrolling sideways, so no tab hides off-screen on a small phone.
        className="flex flex-wrap gap-2"
      >
        {tabs.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={
              tab === key
                ? 'inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-pill bg-primary px-4 text-small font-medium text-on-primary'
                : 'inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-pill border border-border bg-surface px-4 text-small font-medium'
            }
          >
            {t(`profile.tabs.${key}`)}
            <span className="rounded-pill bg-surface-sunken/30 px-1.5 text-[11px] font-semibold">
              {counts[key]}
            </span>
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {list && list.length > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <RecipeCard key={r.id} recipe={r} to={tab === 'drafts' ? `/edit/${r.id}/basics` : undefined} />
            ))}
          </div>
        ) : (
          <EmptyState
            stickers={EMPTY_STICKERS[tab]}
            title={t(`profile.empty.${tab}.title`)}
            body={
              isMe
                ? t(`profile.empty.${tab}.mine`)
                : t(`profile.empty.${tab}.theirs`, { name: p.display_name })
            }
          />
        )}
      </div>
    </div>
  );
}
