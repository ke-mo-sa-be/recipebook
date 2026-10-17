import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import type { Lang } from '@recipebook/core';
import { Button } from '../../components/ui/Button.tsx';
import { ChoiceGroup } from '../../components/ui/ChoiceGroup.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Skeleton } from '../../components/ui/States.tsx';
import { currentLang, setLanguage } from '../../i18n/index.ts';
import { setTextSize, setTheme, usePrefs, type TextSize, type ThemePref } from '../../lib/prefs.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { signOut } from '../auth/api.ts';
import { useMyProfile, useUpdateProfile } from '../profile/api.ts';
import { ProfileFields } from '../profile/ProfileFields.tsx';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const profile = useMyProfile();
  const updateProfile = useUpdateProfile();
  const prefs = usePrefs();
  const lang = currentLang();

  // Deep link from the profile page's "Edit profile" button.
  useEffect(() => {
    if (window.location.hash === '#profile' && profile.data) {
      document.getElementById('profile')?.scrollIntoView();
    }
  }, [profile.data]);

  // Signed-in choices also go to the profile so they follow the person to other devices.
  function chooseLang(next: Lang) {
    setLanguage(next);
    if (session) updateProfile.mutate({ preferred_lang: next });
  }
  function chooseSize(next: TextSize) {
    setTextSize(next);
    if (session) updateProfile.mutate({ text_size: next });
  }

  return (
    <div key={i18n.language} className="mx-auto flex w-full max-w-(--rb-size-reading-max) flex-col gap-8">
      <PageHeader title={t('settings.title')} back />

      <section aria-labelledby="display" className="flex flex-col gap-6 rounded-lg bg-surface p-5 shadow-sm">
        <h2 id="display" className="text-h2">
          {t('settings.display')}
        </h2>
        <ChoiceGroup<Lang>
          legend={t('settings.language')}
          value={lang}
          onChange={chooseLang}
          choices={[
            { value: 'ml', label: 'മലയാളം', lang: 'ml' },
            { value: 'en', label: 'English', lang: 'en' },
          ]}
        />
        <ChoiceGroup<TextSize>
          legend={t('settings.textSize')}
          value={prefs.textSize}
          onChange={chooseSize}
          choices={[
            { value: 'normal', label: t('settings.sizes.normal'), className: 'text-[1rem]' },
            { value: 'large', label: t('settings.sizes.large'), className: 'text-[1.12rem]' },
            { value: 'xl', label: t('settings.sizes.xl'), className: 'text-[1.25rem]' },
          ]}
        />
        <ChoiceGroup<ThemePref>
          legend={t('settings.theme')}
          value={prefs.theme}
          onChange={setTheme}
          choices={[
            { value: 'auto', label: t('settings.themes.auto') },
            { value: 'light', label: t('settings.themes.light') },
            { value: 'dark', label: t('settings.themes.dark') },
          ]}
        />
      </section>

      {session && (
        <section
          id="profile"
          aria-labelledby="profile-h"
          className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-sm"
        >
          <h2 id="profile-h" className="text-h2">
            {t('settings.profile')}
          </h2>
          {profile.data ? (
            <ProfileFields profile={profile.data} submitLabel={t('actions.save')} />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </section>
      )}

      {session && (
        <section
          aria-labelledby="account"
          className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-sm"
        >
          <h2 id="account" className="text-h2">
            {t('settings.account')}
          </h2>
          <p className="text-text-muted">{t('settings.signedInAs', { email: session.user.email })}</p>
          <p className="text-small text-text-muted">{t('settings.moreSoon')}</p>
          <Button
            variant="secondary"
            icon={<LogOut aria-hidden />}
            onClick={() => void signOut().then(() => navigate('/', { replace: true }))}
          >
            {t('auth.signOut')}
          </Button>
        </section>
      )}
    </div>
  );
}
