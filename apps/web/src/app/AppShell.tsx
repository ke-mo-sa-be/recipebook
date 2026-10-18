import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { setLanguage } from '../i18n/index.ts';
import { setTextSize } from '../lib/prefs.ts';
import { useAuth } from '../features/auth/AuthProvider.tsx';
import { useMyProfile } from '../features/profile/api.ts';
import { OnboardingSheet } from '../features/onboarding/OnboardingSheet.tsx';
import { LanguageChooser } from '../features/onboarding/LanguageChooser.tsx';
import { FloatingNav } from './FloatingNav.tsx';
import { TopBar } from './TopBar.tsx';
import { Intro } from '../features/intro/Intro.tsx';
import { playIntroOnStart } from '../features/intro/gate.ts';

function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine,
  );
}

/** One-off success messages passed in the URL by flows that redirect (e.g. ?toast=passwordChanged). */
function QueryToast() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const key = params.get('toast');
  useEffect(() => {
    if (!key) return;
    const id = setTimeout(() => {
      params.delete('toast');
      setParams(params, { replace: true });
    }, 4000);
    return () => clearTimeout(id);
  }, [key, params, setParams]);
  if (!key || !['passwordChanged', 'recipePublished', 'recipeUpdated'].includes(key)) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-md bg-leaf-soft p-4 text-on-leaf-soft shadow-lg md:bottom-8"
    >
      {t(`toast.${key}`)}
    </div>
  );
}

/** When a person signs in, their saved language and text size follow them to this device. */
function useProfilePrefsSync() {
  const { session } = useAuth();
  const profile = useMyProfile();
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!session || !profile.data || syncedFor.current === profile.data.id) return;
    syncedFor.current = profile.data.id;
    setLanguage(profile.data.preferred_lang);
    setTextSize(profile.data.text_size);
  }, [session, profile.data]);
  return profile.data;
}

export function AppShell() {
  const { t } = useTranslation();
  const online = useOnline();
  const profile = useProfilePrefsSync();
  // The wizard has its own Back / Next bar where the nav would be.
  const inWizard = useLocation().pathname.startsWith('/edit/');
  const [intro, setIntro] = useState(playIntroOnStart);
  const endIntro = useCallback(() => setIntro(false), []);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface p-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('nav.skip')}
      </a>
      <TopBar />
      {!online && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 bg-warning-soft p-2 text-center text-small text-on-warning-soft"
        >
          <WifiOff aria-hidden className="size-4" />
          {t('errors.offline')}
        </p>
      )}
      <main
        id="main"
        className="mx-auto w-full max-w-(--rb-size-content-max) px-5 pt-4 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pt-2 lg:pb-16"
      >
        <Outlet />
      </main>
      {!inWizard && <FloatingNav />}
      <QueryToast />
      <ScrollRestoration />
      <LanguageChooser />
      {intro && <Intro onDone={endIntro} />}
      {profile && !profile.onboarded_at && <OnboardingSheet profile={profile} />}
    </>
  );
}
