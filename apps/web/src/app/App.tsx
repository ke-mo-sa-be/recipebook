import { useTranslation } from 'react-i18next';
import { brand } from '../brand/brand.ts';
import { setLanguage } from '../i18n/index.ts';

// Placeholder until the M0 design is approved; the real shell (bottom nav, routes) replaces it in M1.
export function App() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ml';
  return (
    <main className="mx-auto flex min-h-dvh max-w-(--rb-size-reading-max) flex-col justify-center gap-6 p-6">
      <h1 className="text-h1">{brand.name[lang]}</h1>
      <p className="text-lead text-text-muted">{t('app.underConstruction')}</p>
      <button
        type="button"
        className="min-h-tap self-start rounded-md bg-primary px-6 font-bold text-on-primary"
        onClick={() => setLanguage(lang === 'ml' ? 'en' : 'ml')}
      >
        {t('app.switchLanguage')}
      </button>
    </main>
  );
}
