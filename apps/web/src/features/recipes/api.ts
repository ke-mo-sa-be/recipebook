import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lang, UnitCode } from '@recipebook/core';
import { supabase } from '../../lib/supabaseClient.ts';
import { AppError } from '../../lib/appError.ts';

export type Diet = 'veg' | 'egg' | 'nonveg' | 'vegan';
export type Category = { id: number; slug: string; sticker: string };
export type Region = { id: number; slug: string; grp: string };
export type DictionaryItem = {
  id: number;
  slug: string;
  name_en: string;
  name_ml: string;
  aliases: string[];
  grp: string;
  sticker: string | null;
};

export type IngredientLine = {
  id: string;
  position?: number;
  group_label: string | null;
  amount: number | null;
  amount_max: number | null;
  unit_code: UnitCode | null;
  ingredient_id: number | null;
  item_text: string;
  note: string | null;
};
export type Step = {
  id: string;
  position: number;
  body: string;
  photo_path: string | null;
  timer_seconds: number | null;
};

export type Recipe = {
  id: string;
  author_id: string;
  slug: string;
  title_ml: string | null;
  title_en: string | null;
  description: string | null;
  content_lang: Lang;
  category_id: number | null;
  region_id: number | null;
  diet: Diet | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  total_minutes: number;
  servings: number | null;
  tips: string | null;
  cover_path: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  updated_at: string;
  author: {
    handle: string;
    display_name: string;
    avatar_path: string | null;
    district: string | null;
  } | null;
  ingredients: IngredientLine[];
  steps: Step[];
  stats: RecipeStats | null;
  parent_recipe_id?: string | null;
  is_variation?: boolean;
  parent?: {
    id: string;
    slug: string;
    title_ml: string | null;
    title_en: string | null;
    content_lang: Lang;
    status: 'draft' | 'published';
    author: { handle: string; display_name: string } | null;
  } | null;
};

export type RecipeStats = {
  like_count: number;
  save_count: number;
  comment_count: number;
  cooked_count: number;
  variation_count: number;
};

/** A recipe's own title in the language it was written in, then the other one. */
export function titles(r: Pick<Recipe, 'title_ml' | 'title_en' | 'content_lang'>, uiLang: Lang) {
  const first = uiLang === 'ml' ? r.title_ml || r.title_en : r.title_en || r.title_ml;
  const second = uiLang === 'ml' ? (r.title_ml ? r.title_en : null) : r.title_en ? r.title_ml : null;
  return { main: first ?? '', other: second && second !== first ? second : null };
}

const DETAIL = `id, author_id, slug, title_ml, title_en, description, content_lang, category_id, region_id, diet,
  prep_minutes, cook_minutes, total_minutes, servings, tips, cover_path, status, published_at, updated_at,
  author:profiles!recipes_author_id_fkey(handle, display_name, avatar_path, district),
  ingredients:recipe_ingredients(id, position, group_label, amount, amount_max, unit_code, ingredient_id, item_text, note),
  steps:recipe_steps(id, position, body, photo_path, timer_seconds),
  parent_recipe_id, is_variation,
  parent:parent_recipe_id(id, slug, title_ml, title_en, content_lang, status,
    author:profiles!recipes_author_id_fkey(handle, display_name)),
  stats:recipe_stats(like_count, save_count, comment_count, cooked_count, variation_count)`;

export const CARD = `id, slug, title_ml, title_en, content_lang, category_id, diet, total_minutes, servings, cover_path, status,
  published_at, updated_at, author:profiles!recipes_author_id_fkey(handle, display_name, avatar_path, district),
  ingredients:recipe_ingredients(ingredient_id, position),
  stats:recipe_stats(like_count, save_count, comment_count, cooked_count, variation_count)`;

export type RecipeCardData = Omit<
  Recipe,
  | 'ingredients'
  | 'steps'
  | 'description'
  | 'tips'
  | 'region_id'
  | 'prep_minutes'
  | 'cook_minutes'
  | 'author_id'
> & {
  ingredients: Array<{ ingredient_id: number | null; position: number }>;
};

export const recipeKeys = {
  all: ['recipes'] as const,
  detail: (id: string) => ['recipes', 'detail', id] as const,
  byAuthor: (id: string, status: string) => ['recipes', 'author', id, status] as const,
  latest: ['recipes', 'latest'] as const,
};

function sortItems(r: Recipe): Recipe {
  return {
    ...r,
    ingredients: [...r.ingredients].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    steps: [...r.steps].sort((a, b) => a.position - b.position),
  };
}

// ── lookups (rarely change: fetched once per session) ────────────────────────
export function useLookups() {
  return useQuery({
    queryKey: ['lookups'],
    staleTime: Infinity,
    queryFn: async () => {
      const [cats, regions, dict] = await Promise.all([
        supabase.from('categories').select('id, slug, sticker').order('sort'),
        supabase.from('regions').select('id, slug, grp').order('sort'),
        supabase.from('ingredients').select('id, slug, name_en, name_ml, aliases, grp, sticker'),
      ]);
      if (cats.error || regions.error || dict.error) throw new AppError('errors.network');
      const dictionary = dict.data as DictionaryItem[];
      return {
        categories: cats.data as Category[],
        regions: regions.data as Region[],
        dictionary,
        byId: new Map(dictionary.map((d) => [d.id, d])),
      };
    },
  });
}

// ── reads ────────────────────────────────────────────────────────────────────
export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('recipes').select(DETAIL).eq('id', id!).maybeSingle();
      if (error) throw new AppError('errors.network', error);
      return data ? sortItems(data as unknown as Recipe) : null;
    },
  });
}

export function useRecipesByAuthor(authorId: string | undefined, status: 'published' | 'draft') {
  return useQuery({
    queryKey: recipeKeys.byAuthor(authorId ?? '', status),
    enabled: Boolean(authorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(CARD)
        .eq('author_id', authorId!)
        .eq('status', status)
        .order(status === 'draft' ? 'updated_at' : 'published_at', { ascending: false })
        .limit(60);
      if (error) throw new AppError('errors.network', error);
      return data as unknown as RecipeCardData[];
    },
  });
}

export function useLatestRecipes(limit = 12) {
  return useQuery({
    queryKey: recipeKeys.latest,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(CARD)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) throw new AppError('errors.network', error);
      return data as unknown as RecipeCardData[];
    },
  });
}

// ── writes ───────────────────────────────────────────────────────────────────
type RecipePatch = Partial<
  Pick<
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
  >
>;

/** Postgres raises i18n keys from the publish check (P0001); anything else is generic. */
function dbError(error: { code?: string; message?: string }, fallback = 'errors.network'): AppError {
  if (error.code === 'P0001' && error.message?.startsWith('recipe.errors.'))
    return new AppError(error.message, error);
  if (error.code === '42501') return new AppError('errors.forbidden', error);
  return new AppError(fallback, error);
}

export async function createDraft(patch: RecipePatch & { content_lang: Lang }): Promise<string> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) throw new AppError('errors.signInRequired');
  const id = crypto.randomUUID();
  const { error } = await supabase.from('recipes').insert({ id, author_id: uid, ...patch });
  if (error) throw dbError(error);
  return id;
}

export async function updateRecipe(id: string, patch: RecipePatch) {
  const { error } = await supabase.from('recipes').update(patch).eq('id', id);
  if (error) throw dbError(error);
}

export async function saveItems(
  id: string,
  ingredients: IngredientLine[],
  steps: Array<Pick<Step, 'id' | 'body' | 'timer_seconds'>>,
) {
  const { error } = await supabase.rpc('save_recipe_items', {
    p_recipe: id,
    p_ingredients: ingredients.map(
      ({ id, group_label, amount, amount_max, unit_code, ingredient_id, item_text, note }) => ({
        id,
        group_label,
        amount,
        amount_max,
        unit_code,
        ingredient_id,
        item_text: item_text.trim(),
        note,
      }),
    ),
    p_steps: steps.map(({ id, body, timer_seconds }) => ({ id, body: body.trim(), timer_seconds })),
  });
  if (error) throw dbError(error);
}

export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' }) => {
      const { error } = await supabase.from('recipes').update({ status }).eq('id', id);
      if (error) throw dbError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.all }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw dbError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.all }),
  });
}
