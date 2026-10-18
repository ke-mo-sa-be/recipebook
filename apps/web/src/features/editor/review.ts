import type { TFunction } from 'i18next';
import type { EditorState } from './editorState.ts';
import type { WizardStep } from './steps.ts';

/** What the review step lists, and what publishing needs (required checks must pass). */
export type ReviewCheck = { key: string; ok: boolean; required: boolean; step: WizardStep; label: string };

export function reviewChecks(s: EditorState, t: TFunction): ReviewCheck[] {
  const f = s.fields;
  const ingredients = s.ingredients.filter((i) => i.item_text.trim()).length;
  const steps = s.steps.filter((x) => x.body.trim()).length;
  return [
    {
      key: 'title',
      ok: Boolean((f.title_ml || f.title_en)?.trim()),
      required: true,
      step: 'basics',
      label: t('wizard.review.checkTitle'),
    },
    {
      key: 'basics',
      ok: f.category_id != null && f.diet != null && f.servings != null,
      required: true,
      step: 'basics',
      label: t('wizard.review.checkBasics'),
    },
    {
      key: 'ingredients',
      ok: ingredients > 0,
      required: true,
      step: 'ingredients',
      label: t('wizard.review.checkIngredients', { count: ingredients }),
    },
    {
      key: 'steps',
      ok: steps > 0,
      required: true,
      step: 'steps',
      label: t('wizard.review.checkSteps', { count: steps }),
    },
    {
      key: 'photo',
      ok: Boolean(s.cover_path),
      required: false,
      step: 'photo',
      label: s.cover_path ? t('wizard.review.checkPhoto') : t('wizard.review.noPhoto'),
    },
  ];
}
