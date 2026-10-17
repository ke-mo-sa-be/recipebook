import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { passwordSchema } from '@recipebook/core';
import { Button } from '../../components/ui/Button.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
import { errorKey } from '../../lib/appError.ts';
import { AuthLayout } from './AuthLayout.tsx';
import { updatePassword } from './api.ts';

// Reached from the reset email via /auth/callback, which has already signed the person in.
export function ResetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(new FormData(e.currentTarget).get('password'));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'auth.errors.passwordShort');
    setError(null);
    setBusy(true);
    try {
      await updatePassword(parsed.data);
      navigate('/?toast=passwordChanged', { replace: true });
    } catch (err) {
      setError(errorKey(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={t('auth.reset.title')}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label={t('auth.reset.newPassword')}
          hint={t('auth.fields.passwordHint')}
          name="password"
          type="password"
          autoComplete="new-password"
          error={error && t(error)}
        />
        <Button type="submit" full loading={busy}>
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
