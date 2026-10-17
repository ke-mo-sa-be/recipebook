import { Link, Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Settings, UserRound } from 'lucide-react';
import { buttonClass } from '../../components/ui/Button.tsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useMyProfile } from './api.ts';

/** The Profile tab: your public profile when signed in, otherwise an invitation to sign in. */
export function MePage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const profile = useMyProfile();

  if (loading || (session && profile.isPending)) return <Skeleton className="h-48 w-full" />;
  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={<UserRound />}
          title={t('me.signedOut.title')}
          body={t('me.signedOut.body')}
          action={
            <div className="flex w-full max-w-sm flex-col gap-3">
              <Link to="/auth/sign-up?next=/me" className={buttonClass('primary', true)}>
                {t('auth.signUp.title')}
              </Link>
              <Link to="/auth/sign-in?next=/me" className={buttonClass('secondary', true)}>
                {t('auth.signIn.title')}
              </Link>
            </div>
          }
        />
        <Link to="/settings" className={buttonClass('ghost')}>
          <Settings aria-hidden />
          <span>{t('me.signedOut.settings')}</span>
        </Link>
      </div>
    );
  }
  if (profile.isError || !profile.data) return <ErrorState onRetry={() => void profile.refetch()} />;
  return <Navigate to={`/u/${profile.data.handle}`} replace />;
}
