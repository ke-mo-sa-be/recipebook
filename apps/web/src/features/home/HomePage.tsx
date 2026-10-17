import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChefHat } from 'lucide-react';
import { brand } from '../../brand/brand.ts';
import { currentLang } from '../../i18n/index.ts';
import { buttonClass } from '../../components/ui/Button.tsx';
import { EmptyState } from '../../components/ui/States.tsx';

// Real feeds (featured, popular, latest, categories) arrive in M3.
export function HomePage() {
  const { t } = useTranslation();
  const lang = currentLang();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {/* Shrinks with the screen only when the brand name would not fit (long Malayalam word at XL text). */}
        <h1 className="text-[length:min(var(--rb-text-display),9.5vw)] leading-(--rb-leading-display) font-extrabold md:text-display">
          {brand.name[lang]}
        </h1>
        <p className="text-lead text-text-muted">{brand.tagline[lang]}</p>
      </div>
      <Link
        to="/search"
        className="flex min-h-[56px] items-center rounded-md border-2 border-border-strong bg-surface px-4 text-text-muted"
      >
        {t('search.placeholder')}
      </Link>
      <EmptyState
        icon={<ChefHat />}
        title={t('home.soon.title')}
        body={t('home.soon.body')}
        action={
          <Link to="/add" className={buttonClass('primary')}>
            {t('home.soon.action')}
          </Link>
        }
      />
    </div>
  );
}
