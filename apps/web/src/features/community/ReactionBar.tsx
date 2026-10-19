import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import { cx } from '../../components/ui/cx.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import type { RecipeStats } from '../recipes/api.ts';
import { useReactions, useToggleReaction } from './api.ts';

const pill =
  'inline-flex min-h-tap items-center gap-2 rounded-pill border px-4 font-semibold transition-colors [&>svg]:size-5';

/** Like, save and jump to comments. Counts change the moment you tap; signed-out taps go to sign in. */
export function ReactionBar({ recipeId, stats }: { recipeId: string; stats: RecipeStats | null }) {
  const { t } = useTranslation();
  const uid = useUserId();
  const navigate = useNavigate();
  const location = useLocation();
  const reactions = useReactions(recipeId);
  const like = useToggleReaction(recipeId, 'like');
  const save = useToggleReaction(recipeId, 'save');
  const liked = reactions.data?.liked ?? false;
  const saved = reactions.data?.saved ?? false;
  const signIn = () => navigate(`/auth/sign-in?next=${encodeURIComponent(location.pathname)}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={liked}
        onClick={() => (uid ? like.mutate(!liked) : signIn())}
        className={cx(
          pill,
          liked
            ? 'border-accent bg-accent-soft text-on-accent-soft'
            : 'border-border bg-surface hover:bg-surface-sunken',
        )}
      >
        <Heart aria-hidden fill={liked ? 'currentColor' : 'none'} />
        <span>{liked ? t('community.liked') : t('community.like')}</span>
        {(stats?.like_count ?? 0) > 0 && (
          <span className="tabular-nums" aria-label={t('community.likes', { count: stats!.like_count })}>
            {stats!.like_count}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => (uid ? save.mutate(!saved) : signIn())}
        className={cx(
          pill,
          saved
            ? 'border-primary bg-primary text-on-primary'
            : 'border-border bg-surface hover:bg-surface-sunken',
        )}
      >
        <Bookmark aria-hidden fill={saved ? 'currentColor' : 'none'} />
        <span>{saved ? t('community.saved') : t('community.save')}</span>
      </button>
      <a href="#comments" className={cx(pill, 'border-border bg-surface hover:bg-surface-sunken')}>
        <MessageCircle aria-hidden />
        <span>{t('community.comments', { count: stats?.comment_count ?? 0 })}</span>
      </a>
    </div>
  );
}
