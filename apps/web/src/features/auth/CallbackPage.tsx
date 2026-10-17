import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { safeNextPath } from '@recipebook/core';
import { buttonClass } from '../../components/ui/Button.tsx';
import { Skeleton } from '../../components/ui/States.tsx';
import { AuthLayout } from './AuthLayout.tsx';
import { completeAuthRedirect } from './api.ts';

export function CallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [result, setResult] = useState<'pending' | 'confirmed' | 'failed'>('pending');

  useEffect(() => {
    let active = true;
    void completeAuthRedirect(params).then((r) => {
      if (!active) return;
      if (r === 'signed-in') navigate(safeNextPath(params.get('next')), { replace: true });
      else setResult(r);
    });
    return () => {
      active = false;
    };
  }, [params, navigate]);

  if (result === 'pending') {
    return (
      <AuthLayout title={t('auth.callback.working')}>
        <Skeleton className="h-24 w-full" />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout
      title={result === 'confirmed' ? t('auth.callback.confirmedTitle') : t('auth.callback.failedTitle')}
      intro={result === 'confirmed' ? t('auth.callback.confirmedBody') : t('auth.callback.failedBody')}
    >
      <Link to="/auth/sign-in" className={buttonClass('primary', true)}>
        {t('auth.signIn.title')}
      </Link>
    </AuthLayout>
  );
}
