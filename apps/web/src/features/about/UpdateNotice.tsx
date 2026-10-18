import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Sparkles, X } from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { APP_VERSION } from './releases.ts';

/** A one-time card on Home after Paachakam updates (Home decides when, see HomeNotice). */
export function UpdateNotice({ onDismiss: dismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="card flex items-center gap-3 p-4">
      <Sparkles aria-hidden className="size-6 shrink-0" />
      <p className="min-w-0 flex-1">
        {t('whatsNew.updated', { version: APP_VERSION })}{' '}
        <Link to="/whats-new" onClick={dismiss} className="font-semibold underline underline-offset-4">
          {t('whatsNew.see')}
        </Link>
      </p>
      <IconButton label={t('actions.dismiss')} icon={<X aria-hidden />} onClick={dismiss} />
    </div>
  );
}
