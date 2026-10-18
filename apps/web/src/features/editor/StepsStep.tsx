import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Timer, Trash2, X } from 'lucide-react';
import { detectTimerSeconds, type Lang } from '@recipebook/core';
import { Headline } from '../../components/ui/Headline.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { TextArea } from '../../components/ui/TextArea.tsx';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { Polaroid } from '../../components/ui/Polaroid.tsx';
import { PhotoPicker } from '../media/PhotoPicker.tsx';
import { removePhoto, uploadPhoto } from '../media/api.ts';
import type { Step } from '../recipes/api.ts';
import { durationText } from './time.ts';

export function StepsStep({
  recipeId,
  lang,
  steps,
  setSteps,
  dismissed,
  dismissTimer,
  tips,
  setTips,
  flush,
}: {
  recipeId: string;
  lang: Lang;
  steps: Step[];
  setSteps: (s: Step[]) => void;
  dismissed: string[];
  dismissTimer: (stepId: string) => void;
  tips: string | null;
  setTips: (v: string | null) => void;
  /** Saves pending changes; a step must exist on the server before it can get a photo. */
  flush: () => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const update = (i: number, patch: Partial<Step>) =>
    setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...steps];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    setSteps(next.map((s, k) => ({ ...s, position: k })));
  };
  // Suggest a timer from the text ("simmer for 10 minutes") unless the cook removed it for this step.
  const onBody = (i: number, body: string) => {
    const s = steps[i]!;
    update(i, { body, timer_seconds: dismissed.includes(s.id) ? null : detectTimerSeconds(body) });
  };

  return (
    <div className="flex flex-col gap-5">
      <Headline soft={t('wizard.steps.soft')}>{t('wizard.steps.title')}</Headline>
      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.id} className="card flex flex-col gap-3 p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex size-[32px] items-center justify-center rounded-pill bg-surface-sunken text-small font-semibold">
                {i + 1}
              </span>
              <span className="flex-1 text-small font-bold">{t('wizard.steps.stepN', { n: i + 1 })}</span>
              <IconButton
                label={t('wizard.moveUp')}
                icon={<ArrowUp aria-hidden />}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="shadow-none disabled:opacity-30"
              />
              <IconButton
                label={t('wizard.moveDown')}
                icon={<ArrowDown aria-hidden />}
                disabled={i === steps.length - 1}
                onClick={() => move(i, 1)}
                className="shadow-none disabled:opacity-30"
              />
              <IconButton
                label={t('wizard.remove')}
                icon={<Trash2 aria-hidden />}
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                className="shadow-none"
              />
            </div>
            <TextArea
              srOnlyLabel
              label={t('wizard.steps.stepN', { n: i + 1 })}
              lang={lang}
              value={s.body}
              maxLength={2000}
              placeholder={t('wizard.steps.placeholder')}
              onChange={(e) => onBody(i, e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              {s.timer_seconds ? (
                <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-pill bg-leaf-soft pr-1 pl-3 text-small font-semibold text-on-leaf-soft">
                  <Timer aria-hidden className="size-4" />
                  {t('wizard.steps.timer', { time: durationText(t, s.timer_seconds) })}
                  <button
                    type="button"
                    aria-label={t('wizard.steps.timerRemove')}
                    onClick={() => {
                      dismissTimer(s.id);
                      update(i, { timer_seconds: null });
                    }}
                    className="flex size-8 items-center justify-center rounded-pill hover:bg-surface"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </span>
              ) : null}
              {s.photo_path ? (
                <div className="flex items-center gap-2">
                  <Polaroid path={s.photo_path} sticker="cooking" width={72} tilt={-3} />
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await removePhoto({ purpose: 'step', recipeId, stepId: s.id });
                      update(i, { photo_path: null });
                    }}
                  >
                    {t('wizard.photo.remove')}
                  </Button>
                </div>
              ) : (
                <PhotoPicker
                  label={t('wizard.steps.photo')}
                  className="min-h-[40px] px-4 text-small"
                  onPick={async (file) => {
                    if (!(await flush())) throw new Error('not saved');
                    const path = await uploadPhoto(file, { purpose: 'step', recipeId, stepId: s.id });
                    update(i, { photo_path: path });
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
      <Button
        variant="secondary"
        icon={<Plus aria-hidden />}
        onClick={() =>
          setSteps([
            ...steps,
            {
              id: crypto.randomUUID(),
              position: steps.length,
              body: '',
              photo_path: null,
              timer_seconds: null,
            },
          ])
        }
      >
        {t('wizard.steps.add')}
      </Button>
      <TextArea
        lang={lang}
        label={`${t('wizard.steps.tips')} ${t('wizard.optional')}`}
        value={tips ?? ''}
        maxLength={2000}
        rows={3}
        placeholder={t('wizard.steps.tipsPlaceholder')}
        onChange={(e) => setTips(e.target.value || null)}
      />
    </div>
  );
}
