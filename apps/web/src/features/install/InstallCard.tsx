import { Trans, useTranslation } from 'react-i18next';
import { Share, SquarePlus } from 'lucide-react';
import { Button } from '../../components/ui/Button.tsx';
import { promptInstall, snoozeInstall, useInstall } from './install.ts';

/** "Put Paachakam on your home screen": an install button where the browser allows it, steps on iPhone. */
export function InstallCard() {
  const { t } = useTranslation();
  const mode = useInstall();
  if (mode === 'hidden') return null;
  return (
    <section aria-labelledby="install-h" className="card flex items-center gap-4 p-4">
      <img
        src="/icons/icon-192.png"
        alt=""
        width={56}
        height={56}
        className="size-14 shrink-0 rounded-[14px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="install-h" className="text-body font-semibold">
          {t('install.title')}
        </h2>
        {mode === 'ios' ? (
          <p className="text-small text-text-muted">
            <Trans
              i18nKey="install.ios"
              components={{
                share: <Share aria-label={t('install.share')} className="inline size-4 align-text-bottom" />,
                plus: <SquarePlus aria-hidden className="inline size-4 align-text-bottom" />,
                b: <strong />,
              }}
            />
          </p>
        ) : (
          <p className="text-small text-text-muted">{t('install.body')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {mode === 'prompt' && (
            <Button className="min-h-[44px] px-5" onClick={() => void promptInstall()}>
              {t('install.cta')}
            </Button>
          )}
          <Button className="min-h-[44px] px-5" variant="secondary" onClick={snoozeInstall}>
            {t('install.notNow')}
          </Button>
        </div>
      </div>
    </section>
  );
}
