import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button, buttonClass } from '../../components/ui/Button.tsx';
import { TextArea } from '../../components/ui/TextArea.tsx';
import { ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { currentLang } from '../../i18n/index.ts';
import { errorKey } from '../../lib/appError.ts';
import { timeAgo } from '../../lib/timeAgo.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import { useAddComment, useComments, useDeleteComment, useEditComment, type Comment } from './api.ts';

const MAX = 1000;

function CommentItem({ c, recipeId }: { c: Comment; recipeId: string }) {
  const { t } = useTranslation();
  const uid = useUserId();
  const lang = currentLang();
  const edit = useEditComment(recipeId);
  const del = useDeleteComment(recipeId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.body);
  const [confirming, setConfirming] = useState(false);
  const mine = c.author_id === uid;

  return (
    <li className="flex gap-3">
      {c.author ? (
        <Link to={`/u/${c.author.handle}`} aria-hidden tabIndex={-1} className="shrink-0">
          <Avatar name={c.author.display_name} path={c.author.avatar_path} size={36} />
        </Link>
      ) : (
        <Avatar name="?" size={36} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-small">
          {c.author && (
            <Link to={`/u/${c.author.handle}`} className="font-semibold text-text">
              {c.author.display_name}
            </Link>
          )}
          <time dateTime={c.created_at} className="text-text-muted">
            {timeAgo(c.created_at, lang)}
          </time>
          {c.edited_at && <span className="text-text-muted">· {t('community.edited')}</span>}
        </p>
        {editing ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              edit.mutate({ id: c.id, body: draft.trim() }, { onSuccess: () => setEditing(false) });
            }}
          >
            <TextArea
              label={t('community.editLabel')}
              srOnlyLabel
              value={draft}
              maxLength={MAX}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="min-h-[44px] px-5"
                loading={edit.isPending}
                disabled={!draft.trim()}
              >
                {t('actions.save')}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                {t('actions.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <p className="wrap-break-word whitespace-pre-line">{c.body}</p>
        )}
        {mine && !editing && (
          <div className="flex items-center gap-1 text-small">
            {confirming ? (
              <>
                <span className="text-text-muted">{t('community.deleteConfirm')}</span>
                <Button
                  variant="ghost"
                  className="min-h-[40px] px-2"
                  onClick={() => del.mutate(c.id)}
                  loading={del.isPending}
                >
                  {t('actions.delete')}
                </Button>
                <Button variant="ghost" className="min-h-[40px] px-2" onClick={() => setConfirming(false)}>
                  {t('actions.cancel')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="min-h-[40px] px-2" onClick={() => setEditing(true)}>
                  {t('actions.edit')}
                </Button>
                <Button variant="ghost" className="min-h-[40px] px-2" onClick={() => setConfirming(true)}>
                  {t('actions.delete')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Flat comments under a recipe: newest last, post as yourself, edit or delete your own. */
export function Comments({ recipeId, open }: { recipeId: string; open: boolean }) {
  const { t } = useTranslation();
  const uid = useUserId();
  const location = useLocation();
  const comments = useComments(recipeId);
  const add = useAddComment(recipeId);
  const [body, setBody] = useState('');

  return (
    <section id="comments" aria-labelledby="comments-h" className="flex scroll-mt-24 flex-col gap-4">
      <h2 id="comments-h" className="text-h2">
        {t('community.commentsTitle')}
      </h2>
      {comments.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : comments.isError ? (
        <ErrorState onRetry={() => void comments.refetch()} />
      ) : comments.data.length === 0 ? (
        <p className="text-text-muted">{t('community.noComments')}</p>
      ) : (
        <ol className="flex flex-col gap-5">
          {comments.data.map((c) => (
            <CommentItem key={c.id} c={c} recipeId={recipeId} />
          ))}
        </ol>
      )}
      {!open ? null : uid ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = body.trim();
            if (text) add.mutate(text, { onSuccess: () => setBody('') });
          }}
        >
          <TextArea
            label={t('community.addLabel')}
            placeholder={t('community.placeholder')}
            value={body}
            maxLength={MAX}
            onChange={(e) => setBody(e.target.value)}
          />
          {add.isError && (
            <p role="alert" className="text-small text-danger">
              {t(errorKey(add.error))}
            </p>
          )}
          <Button type="submit" className="self-end" loading={add.isPending} disabled={!body.trim()}>
            {t('community.post')}
          </Button>
        </form>
      ) : (
        <Link
          to={`/auth/sign-in?next=${encodeURIComponent(location.pathname + '#comments')}`}
          className={buttonClass('secondary')}
        >
          {t('community.signInToComment')}
        </Link>
      )}
    </section>
  );
}
