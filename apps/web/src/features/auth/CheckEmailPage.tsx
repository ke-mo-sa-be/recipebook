import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MailCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.tsx';
import { errorKey } from '../../lib/appError.ts';
import { AuthLayout } from './AuthLayout.tsx';
import { resendConfirmation } from './api.ts';

const COOLDOWN_SECONDS = 60;

export function CheckEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [wait, setWait] = useState(COOLDOWN_SECONDS);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function resend() {
    setStatus(null);
    try {
      await resendConfirmation(email);
      setStatus('auth.checkEmail.resent');
      setWait(COOLDOWN_SECONDS);
    } catch (err) {
      setStatus(errorKey(err));
    }
  }

  return (
    <AuthLayout title={t('auth.checkEmail.title')}>
      <div className="flex flex-col items-start gap-4 rounded-lg bg-leaf-soft p-5 text-on-leaf-soft">
        <MailCheck aria-hidden className="size-10" />
        <p className="text-lead">{t('auth.checkEmail.body', { email })}</p>
      </div>
      <p className="text-text-muted">{t('auth.checkEmail.notArrived')}</p>
      {email && (
        <Button variant="secondary" disabled={wait > 0} onClick={resend}>
          {wait > 0 ? t('auth.checkEmail.resendIn', { seconds: wait }) : t('auth.checkEmail.resend')}
        </Button>
      )}
      {status && (
        <p role="status" className="text-small">
          {t(status)}
        </p>
      )}
      <Link
        to="/auth/sign-in"
        className="min-h-tap font-semibold text-primary underline-offset-4 hover:underline"
      >
        {t('auth.checkEmail.backToSignIn')}
      </Link>
    </AuthLayout>
  );
}
