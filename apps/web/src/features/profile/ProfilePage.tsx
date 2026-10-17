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
import { NotFoundPage } from '../../app/NotFoundPage.tsx';

const TABS = ['recipes', 'variations', 'cooked'] as const;
const EMPTY_STICKERS: Record<(typeof TABS)[number], string[]> = {
  recipes: ['cooking', 'curry-rice', 'pancakes'],
  variations: ['shrimp', 'fish'],
  cooked: ['camera', 'steaming-bowl'],
};

/** "Ammini's cookbook." Public profile; your own adds Edit profile and Settings. */
export function ProfilePage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUserId();
  const query = useProfileByHandle(handle);
  const [tab, setTab] = useState<(typeof TABS)[number]>('recipes');

  if (query.isPending) return <Skeleton className="h-48 w-full" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const p = query.data;
  if (!p) return <NotFoundPage />;
  const isMe = p.id === uid;
  // Counts are 0 until recipes exist (M2); the copy already handles both.
  const counts = { recipes: 0, variations: 0, cooked: 0 };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        {isMe ? (
          <Avatar name={p.display_name} />
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
        <div className="flex items-center gap-5">
          <span className="hidden lg:block">
            <Avatar name={p.display_name} size={88} />
          </span>
          <div>
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
        className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0"
      >
        {TABS.map((key) => (
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
        <EmptyState
          stickers={EMPTY_STICKERS[tab]}
          title={t(`profile.empty.${tab}.title`)}
          body={
            isMe ? t(`profile.empty.${tab}.mine`) : t(`profile.empty.${tab}.theirs`, { name: p.display_name })
          }
        />
      </div>
    </div>
  );
}
