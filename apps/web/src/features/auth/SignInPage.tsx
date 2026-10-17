import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { safeNextPath, signInSchema } from '@recipebook/core';
import { Button } from '../../components/ui/Button.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
import { errorKey } from '../../lib/appError.ts';
import { AuthLayout } from './AuthLayout.tsx';
import { GoogleButton } from './GoogleButton.tsx';
import { signIn } from './api.ts';
import { fieldErrors } from './zodErrors.ts';

export function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = signInSchema.safeParse(data);
    setFormError(null);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await signIn(parsed.data);
      navigate(next, { replace: true });
    } catch (err) {
      setFormError(errorKey(err));
    } finally {
      setBusy(false);
    }
  }

  const needsConfirm = formError === 'auth.errors.emailNotConfirmed';

  return (
    <AuthLayout title={t('auth.signIn.heading')} soft={t('auth.signIn.soft')}>
      <GoogleButton next={next} />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label={t('auth.fields.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email && t(errors.email)}
        />
        <TextField
          label={t('auth.fields.password')}
          name="password"
          type="password"
          autoComplete="current-password"
          error={errors.password && t(errors.password)}
        />
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-on-danger-soft">
            {t(formError)}{' '}
            {needsConfirm && (
              <Link
                className="font-bold underline"
                to={`/auth/check-email?email=${encodeURIComponent(email)}`}
              >
                {t('auth.checkEmail.resendLink')}
              </Link>
            )}
          </p>
        )}
        <Button type="submit" full loading={busy}>
          {t('auth.signIn.submit')}
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        <Link
          to="/auth/forgot"
          className="inline-flex min-h-tap items-center font-semibold underline decoration-border-strong underline-offset-4"
        >
          {t('auth.signIn.forgot')}
        </Link>
        <p>
          {t('auth.signIn.noAccount')}{' '}
          <Link
            to={`/auth/sign-up?next=${encodeURIComponent(next)}`}
            className="font-semibold underline decoration-border-strong underline-offset-4"
          >
            {t('auth.signUp.title')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
