import type { IngredientLine, Recipe, Step } from '../recipes/api.ts';

export type EditorFields = Pick<
  Recipe,
  | 'title_ml'
  | 'title_en'
  | 'description'
  | 'content_lang'
  | 'category_id'
  | 'region_id'
  | 'diet'
  | 'prep_minutes'
  | 'cook_minutes'
  | 'servings'
  | 'tips'
>;
export type EditorState = {
  fields: EditorFields;
  ingredients: IngredientLine[];
  steps: Step[];
  cover_path: string | null;
  status: Recipe['status'];
  /** Steps whose suggested timer the cook removed, so we don't add it back. */
  dismissedTimers: string[];
};
export type SetField = <K extends keyof EditorFields>(key: K, value: EditorFields[K]) => void;

export function toEditorState(r: Recipe): EditorState {
  const {
    title_ml,
    title_en,
    description,
    content_lang,
    category_id,
    region_id,
    diet,
    prep_minutes,
    cook_minutes,
    servings,
    tips,
  } = r;
  return {
    fields: {
      title_ml,
      title_en,
      description,
      content_lang,
      category_id,
      region_id,
      diet,
      prep_minutes,
      cook_minutes,
      servings,
      tips,
    },
    ingredients: r.ingredients,
    steps: r.steps,
    cover_path: r.cover_path,
    status: r.status,
    dismissedTimers: [],
  };
}
