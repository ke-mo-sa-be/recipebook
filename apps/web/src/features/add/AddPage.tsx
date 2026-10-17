import { useTranslation } from 'react-i18next';
import { CookingPot } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { EmptyState } from '../../components/ui/States.tsx';

// The add-recipe wizard arrives in M2.
export function AddPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('add.title')} />
      <EmptyState icon={<CookingPot />} title={t('add.soon.title')} body={t('add.soon.body')} />
    </div>
  );
}
