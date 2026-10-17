import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { emailSchema } from '@recipebook/core';
import { Button } from '../../components/ui/Button.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
import { errorKey } from '../../lib/appError.ts';
import { AuthLayout } from './AuthLayout.tsx';
import { requestPasswordReset } from './api.ts';

export function ForgotPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(new FormData(e.currentTarget).get('email'));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'auth.errors.emailInvalid');
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(parsed.data);
      setSent(true);
    } catch (err) {
      setError(errorKey(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={t('auth.forgot.title')} soft={t('auth.forgot.soft')} intro={t('auth.forgot.intro')}>
      {sent ? (
        <p role="status" className="card p-5 text-lead">
          {t('auth.forgot.sent')}
        </p>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <TextField
            label={t('auth.fields.email')}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            error={error && t(error)}
          />
          <Button type="submit" full loading={busy}>
            {t('auth.forgot.submit')}
          </Button>
        </form>
      )}
      <Link
        to="/auth/sign-in"
        className="inline-flex min-h-tap items-center font-semibold underline decoration-border-strong underline-offset-4"
      >
        {t('auth.checkEmail.backToSignIn')}
      </Link>
    </AuthLayout>
  );
}
