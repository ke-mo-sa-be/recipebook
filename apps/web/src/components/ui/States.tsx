import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button.tsx';
import { Sticker } from './Sticker.tsx';

/** v2 empty state: a small sticker cluster, a two-tone line, one action. */
export function EmptyState({
  stickers = ['cooking'],
  title,
  body,
  action,
}: {
  stickers?: string[];
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 pt-8 pb-7 text-center">
      <div className="flex items-end justify-center" aria-hidden>
        {stickers.map((slug, i) => (
          <Sticker
            key={slug}
            slug={slug}
            size={i === Math.floor(stickers.length / 2) ? 84 : 64}
            tilt={[-9, 4, 8, -5][i % 4]}
            className={i > 0 ? '-ml-3' : undefined}
          />
        ))}
      </div>
      <h2 className="text-h3">{title}</h2>
      {body && <p className="max-w-(--rb-size-reading-max) text-text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  onRetry,
  title,
  body,
}: {
  onRetry?: () => void;
  title?: ReactNode;
  body?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg bg-danger-soft px-6 py-8 text-center text-on-danger-soft"
    >
      <AlertTriangle aria-hidden className="size-10" />
      <h2 className="text-h3">{title ?? t('errors.title')}</h2>
      <p>{body ?? t('errors.network')}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('actions.tryAgain')}
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-sunken ${className}`} />;
}
