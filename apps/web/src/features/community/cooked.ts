import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient.ts';
import { AppError } from '../../lib/appError.ts';
import { uploadPhoto } from '../media/api.ts';
import { pokePush } from '../push/push.ts';
import { CARD, recipeKeys, type Recipe, type RecipeCardData } from '../recipes/api.ts';

export type CookedPost = {
  id: string;
  recipe_id: string;
  author_id: string;
  photo_path: string;
  note: string | null;
  created_at: string;
  author: { handle: string; display_name: string; avatar_path: string | null } | null;
  recipe?: {
    id: string;
    slug: string;
    title_ml: string | null;
    title_en: string | null;
    content_lang: 'ml' | 'en';
  } | null;
};

const POST = `id, recipe_id, author_id, photo_path, note, created_at,
  author:profiles!cooked_posts_author_id_fkey(handle, display_name, avatar_path)`;

export const cookedKeys = {
  recipe: (recipeId: string) => ['cooked', 'recipe', recipeId] as const,
  author: (authorId: string) => ['cooked', 'author', authorId] as const,
  variations: (recipeId: string) => ['variations', recipeId] as const,
  authorVariations: (authorId: string) => ['variations', 'author', authorId] as const,
};

/** "I cooked this" photos on a recipe, newest first. */
export function useCookedPosts(recipeId: string, limit = 60) {
  return useQuery({
    queryKey: [...cookedKeys.recipe(recipeId), limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooked_posts')
        .select(POST)
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new AppError('errors.network', error);
      return data as unknown as CookedPost[];
    },
  });
}

/** A cook's posts, for their profile. */
export function useCookedByAuthor(authorId: string | undefined) {
  return useQuery({
    queryKey: cookedKeys.author(authorId ?? ''),
    enabled: Boolean(authorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooked_posts')
        .select(`${POST}, recipe:recipes(id, slug, title_ml, title_en, content_lang)`)
        .eq('author_id', authorId!)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw new AppError('errors.network', error);
      return data as unknown as CookedPost[];
    },
  });
}

/** Post a photo of what you made: it goes through the same metadata-stripping pipeline. */
export function usePostCooked(recipeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, note }: { file: File; note: string }) => {
      await uploadPhoto(file, { purpose: 'cooked', recipeId, note: note.trim() || undefined });
      pokePush();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cooked'] });
      qc.setQueryData<Recipe | null>(recipeKeys.detail(recipeId), (r) =>
        r?.stats ? { ...r, stats: { ...r.stats, cooked_count: r.stats.cooked_count + 1 } } : r,
      );
    },
  });
}

export function useDeleteCooked(recipeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cooked_posts').delete().eq('id', id);
      if (error) throw new AppError('errors.network', error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cooked'] });
      qc.setQueryData<Recipe | null>(recipeKeys.detail(recipeId), (r) =>
        r?.stats ? { ...r, stats: { ...r.stats, cooked_count: Math.max(0, r.stats.cooked_count - 1) } } : r,
      );
    },
  });
}

// ── variations ──────────────────────────────────────────────────────────────

/** Published versions of a recipe. */
export function useVariations(recipeId: string) {
  return useQuery({
    queryKey: cookedKeys.variations(recipeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(CARD)
        .eq('parent_recipe_id', recipeId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(60);
      if (error) throw new AppError('errors.network', error);
      return data as unknown as RecipeCardData[];
    },
  });
}

/** A cook's published versions of other recipes, for their profile. */
export function useVariationsByAuthor(authorId: string | undefined) {
  return useQuery({
    queryKey: cookedKeys.authorVariations(authorId ?? ''),
    enabled: Boolean(authorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(CARD)
        .eq('author_id', authorId!)
        .eq('is_variation', true)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(60);
      if (error) throw new AppError('errors.network', error);
      return data as unknown as RecipeCardData[];
    },
  });
}

/** Copy a recipe into my drafts, linked to the original. Returns the new draft's id. */
export function useMakeVariation() {
  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.rpc('make_variation', { source: sourceId });
      if (error) throw new AppError('errors.network', error);
      return data as string;
    },
  });
}
