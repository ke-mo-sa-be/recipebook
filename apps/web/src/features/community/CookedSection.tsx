import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { TextArea } from '../../components/ui/TextArea.tsx';
import { currentLang } from '../../i18n/index.ts';
import { errorKey } from '../../lib/appError.ts';
import { timeAgo } from '../../lib/timeAgo.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import { photoSrcSet, photoUrl } from '../media/api.ts';
import { useCookedPosts, useDeleteCooked, usePostCooked, type CookedPost } from './cooked.ts';

/** One "I cooked this" photo with who made it and their note. */
export function CookedTile({
  post,
  recipeId,
  recipeLink,
}: {
  post: CookedPost;
  recipeId: string;
  recipeLink?: { to: string; title: string };
}) {
  const { t } = useTranslation();
  const uid = useUserId();
  const del = useDeleteCooked(recipeId);
  const lang = currentLang();
  return (
    <figure className="card flex flex-col overflow-hidden">
      <img
        src={photoUrl(post.photo_path, 400)}
        srcSet={photoSrcSet(post.photo_path)}
        sizes="(min-width: 1024px) 240px, 45vw"
        alt={t('cooked.photoAlt', { name: post.author?.display_name ?? '' })}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
      <figcaption className="flex flex-col gap-1 p-3 text-small">
        {recipeLink && (
          <Link to={recipeLink.to} className="font-semibold underline underline-offset-4">
            {recipeLink.title}
          </Link>
        )}
        <span className="flex items-center gap-2">
          {post.author && <Avatar name={post.author.display_name} path={post.author.avatar_path} size={24} />}
          <span className="min-w-0 truncate font-medium">{post.author?.display_name}</span>
          <time dateTime={post.created_at} className="ml-auto shrink-0 text-text-muted">
            {timeAgo(post.created_at, lang)}
          </time>
        </span>
        {post.note && <span className="wrap-break-word text-text-muted">{post.note}</span>}
        {post.author_id === uid && (
          <Button
            variant="ghost"
            className="min-h-[40px] self-start px-0"
            onClick={() => del.mutate(post.id)}
            loading={del.isPending}
          >
            {t('actions.delete')}
          </Button>
        )}
      </figcaption>
    </figure>
  );
}

function CookedSheet({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const post = usePostCooked(recipeId);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const input = useRef<HTMLInputElement>(null);
  // Preview URL for the chosen file; released when it changes or the sheet closes.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <Sheet labelledBy="cooked-h">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (file) post.mutate({ file, note }, { onSuccess: onClose });
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="cooked-h" className="text-h2">
            {t('cooked.sheetTitle')}
          </h2>
          <IconButton label={t('actions.cancel')} icon={<X aria-hidden />} onClick={onClose} />
        </div>
        <p className="text-small text-text-muted">{t('cooked.sheetBody')}</p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={t('cooked.choosePhoto')}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <button type="button" onClick={() => input.current?.click()} className="overflow-hidden rounded-xl">
            <img src={preview} alt="" className="max-h-72 w-full object-cover" />
            <span className="sr-only">{t('cooked.changePhoto')}</span>
          </button>
        ) : (
          <Button variant="secondary" icon={<Camera aria-hidden />} onClick={() => input.current?.click()}>
            {t('cooked.choosePhoto')}
          </Button>
        )}
        <TextArea
          label={t('cooked.noteLabel')}
          placeholder={t('cooked.notePlaceholder')}
          value={note}
          maxLength={140}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
        />
        {post.isError && (
          <p role="alert" className="text-small text-danger">
            {t(errorKey(post.error))}
          </p>
        )}
        <Button type="submit" disabled={!file} loading={post.isPending}>
          {t('cooked.post')}
        </Button>
      </form>
    </Sheet>
  );
}

/** "Cooked it" strip on the recipe page: the latest photos and an "I cooked this" button. */
export function CookedSection({ recipeId, count }: { recipeId: string; count: number }) {
  const { t } = useTranslation();
  const uid = useUserId();
  const navigate = useNavigate();
  const location = useLocation();
  const posts = useCookedPosts(recipeId, 6);
  const [open, setOpen] = useState(false);
  return (
    <section id="cooked" aria-labelledby="cooked-title" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cooked-title" className="text-h2">
          {t('cooked.title')} {count > 0 && <span className="text-text-muted">· {count}</span>}
        </h2>
        {count > 6 && (
          <Link to={`/r/${recipeId}/cooked`} className="min-h-tap text-small font-semibold">
            {t('home.seeAll')}
          </Link>
        )}
      </div>
      {posts.data && posts.data.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {posts.data.map((p) => (
            <li key={p.id}>
              <CookedTile post={p} recipeId={recipeId} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted">{t('cooked.empty')}</p>
      )}
      <Button
        variant="secondary"
        icon={<Camera aria-hidden />}
        className="self-start"
        onClick={() =>
          uid
            ? setOpen(true)
            : navigate(`/auth/sign-in?next=${encodeURIComponent(location.pathname + '#cooked')}`)
        }
      >
        {t('cooked.cta')}
      </Button>
      {open && <CookedSheet recipeId={recipeId} onClose={() => setOpen(false)} />}
    </section>
  );
}
