import { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Skeleton, ErrorState } from '../../components/ui/States.tsx';
import { errorKey } from '../../lib/appError.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import { useUserId } from '../auth/AuthProvider.tsx';
import {
  recipeKeys,
  saveItems,
  updateRecipe,
  useRecipe,
  useSetStatus,
  type IngredientLine,
  type Step,
} from '../recipes/api.ts';
import { toEditorState, type EditorFields, type EditorState, type SetField } from './editorState.ts';
import { isWizardStep, WIZARD_STEPS, type WizardStep } from './steps.ts';
import { useDebouncedSave, type SaveStatus } from './useDebouncedSave.ts';
import { WizardLayout } from './WizardLayout.tsx';
import { BasicsStep } from './BasicsStep.tsx';
import { PhotoStep } from './PhotoStep.tsx';
import { IngredientsStep } from './IngredientsStep.tsx';
import { StepsStep } from './StepsStep.tsx';
import { ReviewStep } from './ReviewStep.tsx';
import { reviewChecks } from './review.ts';

function combine(a: SaveStatus, b: SaveStatus): SaveStatus {
  if (a === 'error' || b === 'error') return 'error';
  if (a === 'saving' || b === 'saving') return 'saving';
  if (a === 'saved' || b === 'saved') return 'saved';
  return 'idle';
}

/** /edit/:id/:step — the add-recipe wizard. Loads the recipe, then hands it to the editor. */
export function EditorPage() {
  const { id = '', step } = useParams();
  const uid = useUserId();
  const recipe = useRecipe(id);
  if (!isWizardStep(step)) return <Navigate to={`/edit/${id}/basics`} replace />;
  if (recipe.isPending) return <Skeleton className="h-96 w-full" />;
  if (recipe.isError) return <ErrorState onRetry={() => void recipe.refetch()} />;
  if (!recipe.data || recipe.data.author_id !== uid) return <NotFoundPage />;
  // key: a different recipe starts a fresh editor; the editor owns its state after loading.
  return <Editor key={id} id={id} step={step} initial={toEditorState(recipe.data)} />;
}

/** Every change autosaves; nothing is lost on close. */
function Editor({ id, step, initial }: { id: string; step: WizardStep; initial: EditorState }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setStatus = useSetStatus();
  const [state, setState] = useState<EditorState>(initial);
  const [publishError, setPublishError] = useState<string | null>(null);
  const patch = useRef<Partial<EditorFields>>({});

  const fieldsSaver = useDebouncedSave<Partial<EditorFields>>(async (p) => {
    await updateRecipe(id, p);
    // Forget only what was saved; newer edits stay queued.
    for (const [k, v] of Object.entries(p))
      if (patch.current[k as keyof EditorFields] === v) delete patch.current[k as keyof EditorFields];
  });
  const itemsSaver = useDebouncedSave<{ ingredients: IngredientLine[]; steps: Step[] }>(
    ({ ingredients, steps }) =>
      // Blank rows are kept on screen but not saved (the database requires text).
      saveItems(
        id,
        ingredients.filter((i) => i.item_text.trim()),
        steps.filter((s) => s.body.trim()),
      ),
    900,
  );

  const setField: SetField = useCallback(
    (key, value) => {
      setState((s) => ({ ...s, fields: { ...s.fields, [key]: value } }));
      patch.current = { ...patch.current, [key]: value };
      fieldsSaver.schedule({ ...patch.current });
    },
    [fieldsSaver],
  );
  const setItems = (next: Partial<Pick<EditorState, 'ingredients' | 'steps'>>) => {
    const merged = { ...state, ...next };
    setState(merged);
    itemsSaver.schedule({ ingredients: merged.ingredients, steps: merged.steps });
  };
  const flushAll = async () => {
    const [a, b] = await Promise.all([fieldsSaver.flush(), itemsSaver.flush()]);
    return a && b;
  };

  const index = WIZARD_STEPS.indexOf(step);
  const go = async (s: WizardStep) => {
    await flushAll();
    navigate(`/edit/${id}/${s}`);
    window.scrollTo({ top: 0 });
  };
  const close = async () => {
    await flushAll();
    await qc.invalidateQueries({ queryKey: recipeKeys.all });
    navigate(state.status === 'published' ? `/r/${id}` : '/add');
  };
  const publish = async () => {
    setPublishError(null);
    if (!(await flushAll())) return setPublishError('wizard.saveError');
    try {
      if (state.status !== 'published') await setStatus.mutateAsync({ id, status: 'published' });
      await qc.invalidateQueries({ queryKey: recipeKeys.all });
      navigate(`/r/${id}?toast=${state.status === 'published' ? 'recipeUpdated' : 'recipePublished'}`);
    } catch (err) {
      setPublishError(errorKey(err));
    }
  };
  const canPublish = reviewChecks(state, t).every((c) => c.ok || !c.required);
  const next = WIZARD_STEPS[index + 1];

  return (
    <WizardLayout
      step={step}
      status={combine(fieldsSaver.status, itemsSaver.status)}
      onClose={() => void close()}
      onGo={(s) => void go(s)}
      onBack={index > 0 ? () => void go(WIZARD_STEPS[index - 1]!) : undefined}
      onNext={next ? () => void go(next) : () => void publish()}
      nextLabel={
        next
          ? t('wizard.next', { step: t(`wizard.stepNames.${next}`) })
          : state.status === 'published'
            ? t('wizard.review.update')
            : t('wizard.review.publish')
      }
      nextDisabled={!next && (!canPublish || setStatus.isPending)}
    >
      {step === 'basics' && <BasicsStep fields={state.fields} setField={setField} />}
      {step === 'photo' && (
        <PhotoStep
          recipeId={id}
          coverPath={state.cover_path}
          categoryId={state.fields.category_id}
          onChange={(path) => setState((s) => ({ ...s, cover_path: path }))}
        />
      )}
      {step === 'ingredients' && (
        <IngredientsStep
          lang={state.fields.content_lang}
          lines={state.ingredients}
          setLines={(ingredients) => setItems({ ingredients })}
        />
      )}
      {step === 'steps' && (
        <StepsStep
          recipeId={id}
          lang={state.fields.content_lang}
          steps={state.steps}
          setSteps={(steps) => setItems({ steps })}
          dismissed={state.dismissedTimers}
          dismissTimer={(sid) =>
            setState((s) => (s ? { ...s, dismissedTimers: [...s.dismissedTimers, sid] } : s))
          }
          tips={state.fields.tips}
          setTips={(v) => setField('tips', v)}
          flush={flushAll}
        />
      )}
      {step === 'review' && <ReviewStep state={state} onGo={(s) => void go(s)} error={publishError} />}
    </WizardLayout>
  );
}
