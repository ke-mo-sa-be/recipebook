import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClass } from '../components/ui/Button.tsx';
import { EmptyState } from '../components/ui/States.tsx';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      stickers={['magnifying-glass-tilted-left', 'fork-and-knife-with-plate']}
      title={t('notFound.title')}
      body={t('notFound.body')}
      action={
        <Link to="/" className={buttonClass('primary')}>
          {t('notFound.home')}
        </Link>
      }
    />
  );
}
