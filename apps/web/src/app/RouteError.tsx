import { useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../components/ui/States.tsx';

/** Last-resort error screen for anything a route throws. Details go to the console, never the screen. */
export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  console.error(error);
  return (
    <main className="mx-auto max-w-md p-6">
      <ErrorState
        title={t('errors.crashTitle')}
        body={t('errors.crashBody')}
        onRetry={() => window.location.reload()}
      />
    </main>
  );
}
