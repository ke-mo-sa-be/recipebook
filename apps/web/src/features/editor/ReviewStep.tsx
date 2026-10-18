import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, ImageOff } from 'lucide-react';
import { Headline } from '../../components/ui/Headline.tsx';
import { Polaroid } from '../../components/ui/Polaroid.tsx';
import { currentLang } from '../../i18n/index.ts';
import { titles, useLookups } from '../recipes/api.ts';
import type { EditorState } from './editorState.ts';
import { reviewChecks } from './review.ts';
import type { WizardStep } from './steps.ts';

export function ReviewStep({
  state,
  onGo,
  error,
}: {
  state: EditorState;
  onGo: (s: WizardStep) => void;
  error: string | null;
}) {
  const { t } = useTranslation();
  const lookups = useLookups();
  const category = lookups.data?.categories.find((c) => c.id === state.fields.category_id);
  const { main, other } = titles(state.fields, currentLang());
  const checks = reviewChecks(state, t);
  return (
    <div className="flex flex-col gap-6">
      <Headline
        soft={state.status === 'published' ? t('wizard.review.softPublished') : t('wizard.review.soft')}
      >
        {t('wizard.review.title')}
      </Headline>
      <div className="card flex items-center gap-5 p-4">
        <Polaroid path={state.cover_path} sticker={category?.sticker ?? 'cooking'} width={110} tilt={-5} />
        <div className="min-w-0">
          <p className="text-h3 break-words" lang={state.fields.content_lang}>
            {main || t('recipe.untitled')}
          </p>
          {other && <p className="text-small text-text-muted">{other}</p>}
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.key} className="card flex min-h-[56px] items-center gap-3 px-4 py-2">
            {c.ok ? (
              <CheckCircle2 aria-hidden className="size-6 shrink-0 text-leaf" />
            ) : c.required ? (
              <Circle aria-hidden className="size-6 shrink-0 text-danger" />
            ) : (
              <ImageOff aria-hidden className="size-6 shrink-0 text-text-muted" />
            )}
            <span className="flex-1">
              {c.label}
              <span className="sr-only">
                {c.ok ? t('wizard.review.done') : c.required ? t('wizard.review.missing') : ''}
              </span>
            </span>
            {!c.ok && (
              <button
                type="button"
                onClick={() => onGo(c.step)}
                className="min-h-tap px-2 font-semibold underline decoration-border-strong underline-offset-4"
              >
                {c.required ? t('wizard.review.fix') : t('wizard.review.add')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-on-danger-soft">
          {t(error)}
        </p>
      )}
      <p className="text-small text-text-muted">{t('wizard.review.guidelines')}</p>
    </div>
  );
}
