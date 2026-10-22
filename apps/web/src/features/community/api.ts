import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient.ts';
import { AppError } from '../../lib/appError.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import { pokePush } from '../push/push.ts';
import { CARD, recipeKeys, type Recipe, type RecipeCardData, type RecipeStats } from '../recipes/api.ts';

export const communityKeys = {
  reactions: (recipeId: string, uid: string | null) => ['reactions', recipeId, uid] as const,
  comments: (recipeId: string) => ['comments', recipeId] as const,
  saved: (uid: string | null) => ['saved', uid] as const,
  notifications: (uid: string | null) => ['notifications', uid] as const,
  unread: (uid: string | null) => ['notifications', 'unread', uid] as const,
};

function fail(error: unknown): never {
  const code = (error as { code?: string; message?: string } | null)?.message;
  // Database checks raise i18n keys (e.g. comment.errors.tooFast); pass those through.
  if (code && /^[a-z]+\.errors\.[a-zA-Z]+$/.test(code)) throw new AppError(code, error);
  throw new AppError('errors.network', error);
}

// ── likes and saves ─────────────────────────────────────────────────────────

/** Whether I have liked / saved this recipe (both private to me). */
export function useReactions(recipeId: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: communityKeys.reactions(recipeId, uid),
    enabled: Boolean(uid && recipeId),
    queryFn: async () => {
      const [likes, saves] = await Promise.all([
        supabase.from('likes').select('recipe_id').eq('recipe_id', recipeId).maybeSingle(),
        supabase.from('saves').select('recipe_id').eq('recipe_id', recipeId).maybeSingle(),
      ]);
      if (likes.error || saves.error) fail(likes.error ?? saves.error);
      return { liked: Boolean(likes.data), saved: Boolean(saves.data) };
    },
  });
}

type Reactions = { liked: boolean; saved: boolean };

/**
 * Like/unlike or save/unsave with the button and the count changing at once; rolled back if the
 * server refuses (e.g. a suspended account).
 */
export function useToggleReaction(recipeId: string, kind: 'like' | 'save') {
  const qc = useQueryClient();
  const uid = useUserId();
  const table = kind === 'like' ? 'likes' : 'saves';
  const flag = kind === 'like' ? 'liked' : 'saved';
  const counter = kind === 'like' ? 'like_count' : 'save_count';
  const reactionsKey = communityKeys.reactions(recipeId, uid);
  const detailKey = recipeKeys.detail(recipeId);
  return useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = on
        ? await supabase.from(table).insert({ recipe_id: recipeId })
        : await supabase.from(table).delete().eq('recipe_id', recipeId).eq('user_id', uid!);
      if (error && error.code !== '23505') fail(error); // a double tap that already landed is fine
    },
    onMutate: async (on: boolean) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: reactionsKey }),
        qc.cancelQueries({ queryKey: detailKey }),
      ]);
      const prevReactions = qc.getQueryData<Reactions>(reactionsKey);
      const prevRecipe = qc.getQueryData<Recipe | null>(detailKey);
      qc.setQueryData<Reactions>(reactionsKey, (r) => ({ liked: false, saved: false, ...r, [flag]: on }));
      if (prevRecipe?.stats) {
        const stats: RecipeStats = {
          ...prevRecipe.stats,
          [counter]: Math.max(0, prevRecipe.stats[counter] + (on ? 1 : -1)),
        };
        const next: Recipe = { ...prevRecipe, stats };
        qc.setQueryData(detailKey, next);
      }
      return { prevReactions, prevRecipe };
    },
    onError: (_e, _on, ctx) => {
      qc.setQueryData(reactionsKey, ctx?.prevReactions);
      qc.setQueryData(detailKey, ctx?.prevRecipe);
    },
    onSuccess: (_d, on) => {
      if (on && kind === 'like') pokePush();
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['saved'] });
      void qc.invalidateQueries({ queryKey: ['search'] });
    },
  });
}

/** My saved recipes, newest first. */
export function useSaved() {
  const uid = useUserId();
  return useQuery({
    queryKey: communityKeys.saved(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saves')
        .select(`created_at, recipe:recipes(${CARD})`)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) fail(error);
      return (data as unknown as Array<{ recipe: RecipeCardData | null }>)
        .map((s) => s.recipe)
        .filter((r): r is RecipeCardData => r !== null);
    },
  });
}

/** Most liked and saved in the last week, for Home. */
export function usePopular(limit = 4) {
  return useQuery({
    queryKey: ['recipes', 'popular', limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('popular_recipes', { days: 7 }).select(CARD).limit(limit);
      if (error) fail(error);
      return data as unknown as RecipeCardData[];
    },
  });
}

// ── comments ────────────────────────────────────────────────────────────────

export type Comment = {
  id: string;
  recipe_id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author: { handle: string; display_name: string; avatar_path: string | null } | null;
};

const COMMENT = `id, recipe_id, author_id, body, created_at, edited_at,
  author:profiles!comments_author_id_fkey(handle, display_name, avatar_path)`;

export function useComments(recipeId: string) {
  return useQuery({
    queryKey: communityKeys.comments(recipeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(COMMENT)
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) fail(error);
      return data as unknown as Comment[];
    },
  });
}

function useCommentMutation<V>(recipeId: string, run: (v: V) => Promise<void>, delta = 0) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      if (delta) {
        qc.setQueryData<Recipe | null>(recipeKeys.detail(recipeId), (r) =>
          r?.stats
            ? { ...r, stats: { ...r.stats, comment_count: Math.max(0, r.stats.comment_count + delta) } }
            : r,
        );
      }
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: communityKeys.comments(recipeId) }),
  });
}

export const useAddComment = (recipeId: string) =>
  useCommentMutation<string>(
    recipeId,
    async (body) => {
      const { error } = await supabase.from('comments').insert({ recipe_id: recipeId, body });
      if (error) fail(error);
      pokePush();
    },
    1,
  );

export const useEditComment = (recipeId: string) =>
  useCommentMutation<{ id: string; body: string }>(recipeId, async ({ id, body }) => {
    const { error } = await supabase.from('comments').update({ body }).eq('id', id);
    if (error) fail(error);
  });

export const useDeleteComment = (recipeId: string) =>
  useCommentMutation<string>(
    recipeId,
    async (id) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) fail(error);
    },
    -1,
  );

// ── notifications ───────────────────────────────────────────────────────────

export type Notification = {
  id: number;
  kind: 'like' | 'comment' | 'cooked' | 'variation';
  created_at: string;
  read_at: string | null;
  recipe: {
    id: string;
    slug: string;
    title_ml: string | null;
    title_en: string | null;
    content_lang: 'ml' | 'en';
  } | null;
  actor: { handle: string; display_name: string; avatar_path: string | null } | null;
  comment: { body: string } | null;
};

export function useNotifications() {
  const uid = useUserId();
  return useQuery({
    queryKey: communityKeys.notifications(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          `id, kind, created_at, read_at,
           recipe:recipes(id, slug, title_ml, title_en, content_lang),
           actor:profiles!notifications_actor_id_fkey(handle, display_name, avatar_path),
           comment:comments(body)`,
        )
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) fail(error);
      return data as unknown as Notification[];
    },
  });
}

/** Unread count for the bell; refreshed when the app comes back to the foreground. */
export function useUnreadCount() {
  const uid = useUserId();
  return useQuery({
    queryKey: communityKeys.unread(uid),
    enabled: Boolean(uid),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) fail(error);
      return count ?? 0;
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);
      if (error) fail(error);
    },
    onSuccess: () => qc.setQueryData(communityKeys.unread(uid), 0),
  });
}
