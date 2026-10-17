import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

export function PageHeader({
  title,
  back = false,
  action,
}: {
  title: ReactNode;
  back?: boolean;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <header className="flex items-center gap-2 pb-4">
      {back && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="-ml-2 inline-flex min-h-tap items-center gap-1 rounded-md px-2 font-semibold"
        >
          <ChevronLeft aria-hidden />
          <span>{t('actions.back')}</span>
        </button>
      )}
      <h1 className="flex-1 text-h1">{title}</h1>
      {action}
    </header>
  );
}
