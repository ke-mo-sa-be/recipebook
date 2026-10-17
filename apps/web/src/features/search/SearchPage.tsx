import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { EmptyState } from '../../components/ui/States.tsx';

export function SearchPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('nav.search')} />
      <label className="sr-only" htmlFor="q">
        {t('search.placeholder')}
      </label>
      <input
        id="q"
        type="search"
        enterKeyHint="search"
        placeholder={t('search.placeholder')}
        className="min-h-[56px] rounded-md border-2 border-border-strong bg-surface px-4 text-body"
      />
      <EmptyState icon={<Search />} title={t('search.soon.title')} body={t('search.soon.body')} />
    </div>
  );
}
