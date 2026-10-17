import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button.tsx';

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-10 text-center shadow-sm">
      {icon && <div className="text-accent [&>svg]:size-12">{icon}</div>}
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
  return <div aria-hidden className={`animate-pulse rounded-sm bg-surface-sunken ${className}`} />;
}
