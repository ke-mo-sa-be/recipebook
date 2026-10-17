import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { EmptyState } from '../../components/ui/States.tsx';

export function SavedPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('saved.title')} soft={t('saved.soft')} />
      <EmptyState
        stickers={['bookmark', 'red-heart']}
        title={t('saved.empty.title')}
        body={t('saved.empty.body')}
      />
    </div>
  );
}
