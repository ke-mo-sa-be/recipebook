import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { useUserId } from '../auth/AuthProvider.tsx';
import { useUnreadCount } from './api.ts';

/** Bell with an unread badge; only for signed-in people. */
export function NotificationBell() {
  const { t } = useTranslation();
  const uid = useUserId();
  const unread = useUnreadCount();
  if (!uid) return null;
  const n = unread.data ?? 0;
  const label = n > 0 ? t('notifications.bellUnread', { count: n }) : t('notifications.title');
  return (
    <Link
      to="/notifications"
      aria-label={label}
      title={label}
      className="relative inline-flex size-[44px] shrink-0 items-center justify-center rounded-pill bg-surface shadow-sm"
    >
      <Bell aria-hidden className="size-5" />
      {n > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 min-w-[20px] rounded-pill bg-accent px-1 text-center text-[11px] leading-5 font-bold text-on-accent"
        >
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  );
}
