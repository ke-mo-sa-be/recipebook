import { Link, Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { buttonClass } from '../../components/ui/Button.tsx';
import { Headline } from '../../components/ui/Headline.tsx';
import { ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useMyProfile } from './api.ts';

/** The Profile tab: your cookbook when signed in, otherwise an invitation to join. */
export function MePage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const profile = useMyProfile();

  if (loading || (session && profile.isPending)) return <Skeleton className="h-48 w-full" />;
  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-4">
        <div className="flex items-end justify-center" aria-hidden>
          <Sticker slug="cooking" size={80} tilt={-8} />
          <Sticker slug="curry-rice" size={96} tilt={4} className="-ml-3" />
          <Sticker slug="teacup-without-handle" size={76} tilt={8} className="-ml-3" />
        </div>
        <Headline soft={t('me.signedOut.soft')}>{t('me.signedOut.title')}</Headline>
        <p className="text-text-muted">{t('me.signedOut.body')}</p>
        <div className="flex flex-col gap-3">
          <Link to="/auth/sign-up?next=/me" className={buttonClass('primary', true)}>
            {t('auth.signUp.title')}
          </Link>
          <Link to="/auth/sign-in?next=/me" className={buttonClass('secondary', true)}>
            {t('auth.signIn.title')}
          </Link>
        </div>
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
