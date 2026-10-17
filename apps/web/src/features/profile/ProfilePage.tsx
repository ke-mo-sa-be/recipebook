import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BookOpen, Settings } from 'lucide-react';
import { buttonClass } from '../../components/ui/Button.tsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { cx } from '../../components/ui/cx.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import { useProfileByHandle } from './api.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';

const TABS = ['recipes', 'variations', 'cooked'] as const;

export function Avatar({ name, size = 'lg' }: { name: string; size?: 'md' | 'lg' }) {
  // Photo avatars arrive with the image pipeline in M2; until then, a friendly initial.
  return (
    <div
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-pill bg-accent font-extrabold text-on-accent',
        size === 'lg' ? 'size-20 text-h1' : 'size-10 text-h3',
      )}
    >
      {Array.from(name.trim())[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export function ProfilePage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const uid = useUserId();
  const query = useProfileByHandle(handle);
  const [tab, setTab] = useState<(typeof TABS)[number]>('recipes');

  if (query.isPending) return <Skeleton className="h-48 w-full" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const p = query.data;
  if (!p) return <NotFoundPage />;
  const isMe = p.id === uid;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={p.display_name} />
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 break-words">{p.display_name}</h1>
          <p className="text-text-muted">
            @{p.handle}
            {p.district && ` · ${t(`districts.${p.district}`)}`}
          </p>
        </div>
      </div>
      {p.status === 'suspended' && (
        <p className="rounded-md bg-warning-soft p-3 text-on-warning-soft">{t('profile.suspended')}</p>
      )}
      {p.bio && <p className="text-lead">{p.bio}</p>}
      {isMe && (
        <div className="flex gap-3">
          <Link to="/settings#profile" className={buttonClass('secondary')}>
            {t('profile.edit')}
          </Link>
          <Link to="/settings" className={buttonClass('secondary')}>
            <Settings aria-hidden />
            <span>{t('nav.settings')}</span>
          </Link>
        </div>
      )}
      <div role="tablist" aria-label={t('profile.tabsLabel')} className="flex gap-2 border-b-2 border-border">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cx(
              '-mb-0.5 min-h-tap border-b-4 px-3 font-semibold',
              tab === key ? 'border-primary text-text' : 'border-transparent text-text-muted',
            )}
          >
            {t(`profile.tabs.${key}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <EmptyState
          icon={<BookOpen />}
          title={t(`profile.empty.${tab}.title`)}
          body={
            isMe ? t(`profile.empty.${tab}.mine`) : t(`profile.empty.${tab}.theirs`, { name: p.display_name })
          }
        />
      </div>
    </div>
  );
}
