import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DISTRICTS, profileUpdateSchema } from '@recipebook/core';
import { Button } from '../../components/ui/Button.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
import { SelectField } from '../../components/ui/SelectField.tsx';
import { errorKey } from '../../lib/appError.ts';
import { fieldErrors } from '../auth/zodErrors.ts';
import { useUpdateProfile, type Profile } from './api.ts';

/** Name, handle, district and (optionally) bio. Used by first-sign-in onboarding and Settings. */
export function ProfileFields({
  profile,
  withBio = true,
  submitLabel,
  markOnboarded = false,
  onSaved,
  extra,
}: {
  profile: Profile;
  withBio?: boolean;
  submitLabel: ReactNode;
  markOnboarded?: boolean;
  onSaved?: () => void;
  extra?: ReactNode;
}) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const form = new FormData(e.currentTarget);
    const parsed = profileUpdateSchema.safeParse({
      handle: form.get('handle'),
      display_name: form.get('display_name'),
      bio: withBio ? String(form.get('bio') ?? '').trim() || null : profile.bio,
      district: form.get('district') || null,
      preferred_lang: profile.preferred_lang,
      text_size: profile.text_size,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    try {
      await update.mutateAsync({
        ...parsed.data,
        ...(markOnboarded ? { onboarded_at: new Date().toISOString() } : {}),
      });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      const key = errorKey(err);
      setErrors(key.startsWith('profile.errors.handle') ? { handle: key } : { _: key });
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <TextField
        label={t('profile.fields.displayName')}
        name="display_name"
        defaultValue={profile.display_name}
        maxLength={60}
        autoComplete="name"
        error={errors.display_name && t(errors.display_name)}
      />
      <TextField
        label={t('profile.fields.handle')}
        hint={t('profile.fields.handleHint')}
        name="handle"
        defaultValue={profile.handle}
        maxLength={30}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        error={errors.handle && t(errors.handle)}
      />
      <SelectField
        label={t('profile.fields.district')}
        name="district"
        defaultValue={profile.district ?? ''}
        placeholder={t('profile.fields.districtNone')}
        options={DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))}
      />
      {withBio && (
        <TextField
          label={t('profile.fields.bio')}
          hint={t('profile.fields.bioHint')}
          name="bio"
          defaultValue={profile.bio ?? ''}
          maxLength={280}
        />
      )}
      {errors._ && (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-on-danger-soft">
          {t(errors._)}
        </p>
      )}
      {saved && !markOnboarded && (
        <p role="status" className="rounded-md bg-leaf-soft p-3 text-on-leaf-soft">
          {t('profile.saved')}
        </p>
      )}
      {extra}
      <Button type="submit" full loading={update.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
