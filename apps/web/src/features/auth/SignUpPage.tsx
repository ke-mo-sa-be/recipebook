import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { safeNextPath, signUpSchema } from '@recipebook/core';
import { Button } from '../../components/ui/Button.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
import { errorKey } from '../../lib/appError.ts';
import { currentLang } from '../../i18n/index.ts';
import { AuthLayout } from './AuthLayout.tsx';
import { GoogleButton } from './GoogleButton.tsx';
import { signUp } from './api.ts';
import { fieldErrors } from './zodErrors.ts';

export function SignUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setFormError(null);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await signUp({ ...parsed.data, lang: currentLang() });
      navigate(`/auth/check-email?email=${encodeURIComponent(parsed.data.email)}`, { replace: true });
    } catch (err) {
      setFormError(errorKey(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t('auth.signUp.heading')}
      soft={t('auth.signUp.soft')}
      stickers={[
        { slug: 'coconut', size: 74, tilt: -7 },
        { slug: 'curry-rice', size: 92, tilt: 4 },
        { slug: 'banana', size: 72, tilt: 9 },
      ]}
    >
      <GoogleButton next={next} />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label={t('auth.fields.displayName')}
          hint={t('auth.fields.displayNameHint')}
          name="displayName"
          autoComplete="name"
          maxLength={60}
          error={errors.displayName && t(errors.displayName)}
        />
        <TextField
          label={t('auth.fields.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email && t(errors.email)}
        />
        <TextField
          label={t('auth.fields.password')}
          hint={t('auth.fields.passwordHint')}
          name="password"
          type="password"
          autoComplete="new-password"
          error={errors.password && t(errors.password)}
        />
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-on-danger-soft">
            {t(formError)}
          </p>
        )}
        <Button type="submit" full loading={busy}>
          {t('auth.signUp.submit')}
        </Button>
      </form>
      <p>
        {t('auth.signUp.haveAccount')}{' '}
        <Link
          to={`/auth/sign-in?next=${encodeURIComponent(next)}`}
          className="font-semibold underline decoration-border-strong underline-offset-4"
        >
          {t('auth.signIn.title')}
        </Link>
      </p>
    </AuthLayout>
  );
}
