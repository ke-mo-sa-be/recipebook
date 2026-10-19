import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient.ts';
import { AppError } from '../../lib/appError.ts';
import { CARD, type RecipeCardData } from '../recipes/api.ts';
import type { SearchArgs } from './params.ts';

export const PAGE_SIZE = 24;

type Page = { rows: RecipeCardData[]; total: number };

/** search_recipes, a page at a time, with the total count (search, category pages, Home rows). */
export function useRecipeSearch(args: SearchArgs, { enabled = true, pageSize = PAGE_SIZE } = {}) {
  return useInfiniteQuery({
    queryKey: ['search', args, pageSize],
    enabled,
    initialPageParam: 0,
    staleTime: 60_000,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const { data, error, count } = await supabase
        .rpc('search_recipes', args, { count: 'exact' })
        .select(CARD)
        .range(pageParam, pageParam + pageSize - 1);
      if (error) throw new AppError('errors.network', error);
      return { rows: (data ?? []) as unknown as RecipeCardData[], total: count ?? 0 };
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.rows.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
}

/** Published recipes per category id, for the Home category grid. */
export function useCategoryCounts() {
  return useQuery({
    queryKey: ['category-counts'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('category_counts');
      if (error) throw new AppError('errors.network', error);
      return new Map(
        (data as Array<{ category_id: number; recipes: number }>).map((r) => [r.category_id, r.recipes]),
      );
    },
  });
}

/** Recipes the admins featured, newest pick first. */
export function useFeatured(limit = 3) {
  return useQuery({
    queryKey: ['recipes', 'featured', limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(CARD)
        .eq('status', 'published')
        .not('featured_at', 'is', null)
        .order('featured_at', { ascending: false })
        .limit(limit);
      if (error) throw new AppError('errors.network', error);
      return data as unknown as RecipeCardData[];
    },
  });
}
