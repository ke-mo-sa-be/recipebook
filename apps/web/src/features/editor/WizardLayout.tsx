import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CloudOff, Loader2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button.tsx';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { cx } from '../../components/ui/cx.ts';
import { WIZARD_STEPS, type WizardStep } from './steps.ts';
import type { SaveStatus } from './useDebouncedSave.ts';

/** Top: close, step progress (tappable), save status. Bottom: Back / Next in the same place on every step. */
export function WizardLayout({
  step,
  status,
  onClose,
  onGo,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  children,
}: {
  step: WizardStep;
  status: SaveStatus;
  onClose: () => void;
  onGo: (s: WizardStep) => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const index = WIZARD_STEPS.indexOf(step);
  return (
    <div className="mx-auto flex w-full max-w-(--rb-size-reading-max) flex-col gap-6 pb-28">
      <div className="flex items-center gap-3">
        <IconButton label={t('wizard.close')} icon={<X aria-hidden />} onClick={onClose} />
        <nav aria-label={t('wizard.progressLabel')} className="flex flex-1 gap-1.5">
          {WIZARD_STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => onGo(s)}
              aria-current={s === step ? 'step' : undefined}
              aria-label={t('wizard.progress', {
                n: i + 1,
                total: WIZARD_STEPS.length,
                name: t(`wizard.stepNames.${s}`),
              })}
              className="flex min-h-tap flex-1 items-center"
            >
              <span className={cx('h-[5px] w-full rounded-pill', i <= index ? 'bg-primary' : 'bg-border')} />
            </button>
          ))}
        </nav>
        <span
          role="status"
          className="flex min-w-[5.5rem] items-center justify-end gap-1 text-small text-text-muted"
        >
          {status === 'saving' && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {status === 'saved' && <Check aria-hidden className="size-4 text-leaf" />}
          {status === 'error' && <CloudOff aria-hidden className="size-4 text-danger" />}
          <span className={status === 'error' ? 'text-danger' : undefined}>
            {status === 'saving'
              ? t('wizard.saving')
              : status === 'saved'
                ? t('wizard.saved')
                : status === 'error'
                  ? t('wizard.saveError')
                  : ''}
          </span>
        </span>
      </div>
      {children}
      <div className="fixed inset-x-0 bottom-[calc(14px+env(safe-area-inset-bottom))] z-40 px-3.5">
        <div className="mx-auto flex max-w-(--rb-size-reading-max) gap-2.5">
          {onBack && (
            <Button variant="secondary" className="min-h-[56px] flex-[0_0_8.5rem] shadow-lg" onClick={onBack}>
              {t('wizard.back')}
            </Button>
          )}
          {onNext && (
            <Button className="min-h-[56px] flex-1 shadow-lg" onClick={onNext} disabled={nextDisabled}>
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
