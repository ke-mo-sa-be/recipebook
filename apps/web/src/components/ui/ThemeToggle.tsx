import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { setTheme, usePrefs } from '../../lib/prefs.ts';
import { IconButton } from './IconButton.tsx';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function useSystemDark() {
  return useSyncExternalStore(
    (cb) => {
      const q = darkQuery();
      q.addEventListener('change', cb);
      return () => q.removeEventListener('change', cb);
    },
    () => darkQuery().matches,
  );
}

/**
 * One-tap light/dark switch for the page top rows and the desktop top bar. It flips whatever is showing
 * now (including the phone's own setting under "Auto"); Settings still offers Auto.
 */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme } = usePrefs();
  const systemDark = useSystemDark();
  const dark = theme === 'dark' || (theme === 'auto' && systemDark);
  return (
    <IconButton
      label={dark ? t('theme.toLight') : t('theme.toDark')}
      icon={dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    />
  );
}
