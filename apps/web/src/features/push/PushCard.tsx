import { useTranslation } from 'react-i18next';
import { BellRing } from 'lucide-react';
import { Button } from '../../components/ui/Button.tsx';
import { errorKey } from '../../lib/appError.ts';
import { usePush } from './usePush.ts';

/** Offer push on this device when it can have it and doesn't yet; explain when it can't. */
export function PushCard({ inSettings = false }: { inSettings?: boolean }) {
  const { t } = useTranslation();
  const { state, toggle } = usePush();
  if (!state || state === 'unsupported' || state === 'not-configured') return null;
  if (state === 'on' && !inSettings) return null;
  return (
    <section
      aria-labelledby="push-h"
      className={inSettings ? 'card flex flex-col gap-3 p-5' : 'card flex flex-col gap-3 p-4'}
    >
      <h2 id="push-h" className="flex items-center gap-2 font-semibold">
        <BellRing aria-hidden className="size-5" />
        {t('push.title')}
      </h2>
      <p className="text-small text-text-muted">{t(`push.state.${state}`)}</p>
      {(state === 'off' || state === 'on') && (
        <Button
          variant={state === 'on' ? 'secondary' : 'primary'}
          className="self-start min-h-[44px] px-5"
          loading={toggle.isPending}
          onClick={() => toggle.mutate(state !== 'on')}
        >
          {state === 'on' ? t('push.turnOff') : t('push.turnOn')}
        </Button>
      )}
      {toggle.isError && (
        <p role="alert" className="text-small text-danger">
          {t(errorKey(toggle.error, 'push.errors.failed'))}
        </p>
      )}
    </section>
  );
}
