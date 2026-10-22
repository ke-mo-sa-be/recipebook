import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Camera, GitFork, Heart, MessageCircle } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { cx } from '../../components/ui/cx.ts';
import { currentLang } from '../../i18n/index.ts';
import { timeAgo } from '../../lib/timeAgo.ts';
import { titles } from '../recipes/api.ts';
import { PushCard } from '../push/PushCard.tsx';
import { useMarkAllRead, useNotifications, type Notification } from './api.ts';

function Item({ n }: { n: Notification }) {
  const { t } = useTranslation();
  const lang = currentLang();
  if (!n.recipe) return null;
  const { main } = titles(n.recipe, lang);
  const who = n.actor?.display_name ?? t('notifications.someone');
  const anchor = n.kind === 'comment' ? '#comments' : n.kind === 'cooked' ? '#cooked' : '';
  const to = `/r/${n.recipe.id}/${n.recipe.slug}${anchor}`;
  return (
    <li>
      <Link to={to} className={cx('card flex items-start gap-3 p-4', !n.read_at && 'ring-2 ring-accent/40')}>
        <span className="relative shrink-0">
          <Avatar name={who} path={n.actor?.avatar_path} size={40} />
          <span className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-pill bg-surface shadow-sm">
            {n.kind === 'like' ? (
              <Heart aria-hidden className="size-3.5 text-accent" fill="currentColor" />
            ) : n.kind === 'cooked' ? (
              <Camera aria-hidden className="size-3.5" />
            ) : n.kind === 'variation' ? (
              <GitFork aria-hidden className="size-3.5" />
            ) : (
              <MessageCircle aria-hidden className="size-3.5" />
            )}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="wrap-break-word">{t(`notifications.${n.kind}`, { who, recipe: main })}</span>
          {n.kind === 'comment' && n.comment && (
            <span className="line-clamp-2 text-small text-text-muted">“{n.comment.body}”</span>
          )}
          <time dateTime={n.created_at} className="text-small text-text-muted">
            {timeAgo(n.created_at, lang)}
            {!n.read_at && <span className="sr-only"> · {t('notifications.new')}</span>}
          </time>
        </span>
      </Link>
    </li>
  );
}

/** /notifications: likes and comments on your recipes. Opening the page marks them read. */
export function NotificationsPage() {
  const { t } = useTranslation();
  const list = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead(); // stable across renders
  const marked = useRef(false);
  const hasUnread = list.data?.some((n) => !n.read_at) ?? false;

  useEffect(() => {
    // Mark read a moment after they are shown; this visit keeps highlighting what was new.
    if (!hasUnread || marked.current) return;
    const id = setTimeout(() => {
      marked.current = true;
      markAllRead();
    }, 1500);
    return () => clearTimeout(id);
  }, [hasUnread, markAllRead]);

  return (
    <div className="mx-auto flex w-full max-w-(--rb-size-reading-max) flex-col gap-4">
      <PageHeader back title={t('notifications.title')} soft={t('notifications.soft')} />
      <PushCard />
      {list.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState
          stickers={['red-heart', 'cooking']}
          title={t('notifications.empty.title')}
          body={t('notifications.empty.body')}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.data.map((n) => (
            <Item key={n.id} n={n} />
          ))}
        </ul>
      )}
    </div>
  );
}
