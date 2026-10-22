import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Clock, Languages, Lightbulb, Pencil, Play, Timer, Trash2, Users } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button, buttonClass } from '../../components/ui/Button.tsx';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.tsx';
import { Polaroid } from '../../components/ui/Polaroid.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { Stepper } from '../../components/ui/Stepper.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { cx } from '../../components/ui/cx.ts';
import { currentLang } from '../../i18n/index.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import { photoSrcSet, photoUrl } from '../media/api.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import { durationText } from '../editor/time.ts';
import { DietMark } from './DietMark.tsx';
import { Comments } from '../community/Comments.tsx';
import { ReactionBar } from '../community/ReactionBar.tsx';
import { CookedSection } from '../community/CookedSection.tsx';
import { BasedOn, VariationActions } from '../community/Variations.tsx';
import { amountText, lineSticker } from './format.ts';
import { titles, useDeleteRecipe, useLookups, useRecipe, useSetStatus, type IngredientLine } from './api.ts';

/** Ingredients with their group headings ("For grinding"), in order. */
function grouped(lines: IngredientLine[]) {
  const out: Array<{ label: string | null; lines: IngredientLine[] }> = [];
  for (const l of lines) {
    const last = out.at(-1);
    if (last && last.label === l.group_label) last.lines.push(l);
    else out.push({ label: l.group_label, lines: [l] });
  }
  return out;
}

export function RecipePage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUserId();
  const recipe = useRecipe(id);
  const lookups = useLookups();
  const setStatus = useSetStatus();
  const del = useDeleteRecipe();
  const [servings, setServings] = useState<number | null>(null);
  const [metric, setMetric] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (recipe.isPending) return <Skeleton className="h-[70vh] w-full" />;
  if (recipe.isError) return <ErrorState onRetry={() => void recipe.refetch()} />;
  const r = recipe.data;
  if (!r) return <NotFoundPage />;

  const lang = currentLang();
  const { main, other } = titles(r, lang);
  const isOwner = r.author_id === uid;
  const category = lookups.data?.categories.find((c) => c.id === r.category_id);
  const region = lookups.data?.regions.find((x) => x.id === r.region_id);
  const base = r.servings ?? 1;
  const people = servings ?? base;
  const factor = people / base;

  return (
    <article className="flex flex-col gap-6 pb-28" lang={r.content_lang}>
      <div className="flex items-center justify-between" lang={lang}>
        <IconButton
          label={t('actions.back')}
          icon={<ChevronLeft aria-hidden />}
          onClick={() => navigate(-1)}
        />
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <Link to={`/edit/${r.id}/basics`} className={cx(buttonClass('secondary'), 'min-h-[44px]')}>
                <Pencil aria-hidden />
                <span>{t('actions.edit')}</span>
              </Link>
              <IconButton
                label={t('actions.delete')}
                icon={<Trash2 aria-hidden />}
                onClick={() => setConfirmDelete(true)}
              />
            </>
          )}
          <span className="lg:hidden">
            <ThemeToggle />
          </span>
        </div>
      </div>

      {r.status === 'draft' && (
        <p lang={lang} className="rounded-lg bg-warning-soft p-3 text-on-warning-soft">
          {t('recipe.draftBanner')}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-12">
        {/* Left on desktop: photo, title, meta, ingredients */}
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 pt-2">
              <h1 className="text-h1 md:text-display">
                <span className="block">{main || t('recipe.untitled')}</span>
                {other && <span className="block text-h2 text-text-soft">{other}</span>}
              </h1>
              <div lang={lang} className="mt-2">
                <BasedOn recipe={r} />
              </div>
            </div>
            <Polaroid
              path={r.cover_path}
              sticker={category?.sticker ?? 'cooking'}
              width={136}
              tilt={6}
              alt={main}
              className="mt-1"
            />
          </div>
          <div lang={lang} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-muted">
            {r.author && (
              <Link
                to={`/u/${r.author.handle}`}
                className="inline-flex min-h-tap items-center gap-2 font-medium text-text"
              >
                <Avatar name={r.author.display_name} path={r.author.avatar_path} size={28} />
                {r.author.display_name}
              </Link>
            )}
            {r.total_minutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden className="size-4" />
                {t('recipe.minutes', { count: r.total_minutes })}
              </span>
            )}
            {r.diet && <DietMark diet={r.diet} showLabel />}
            {category && <span>{t(`categories.${category.slug}`)}</span>}
            {region && <span>{t(`regions.${region.slug}`)}</span>}
            {/* Recipe text is what the cook wrote; say so when it isn't in the reader's language. */}
            {r.content_lang !== lang && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-surface-sunken px-2.5 py-0.5">
                <Languages aria-hidden className="size-4" />
                {t(`recipe.writtenIn.${r.content_lang}`)}
              </span>
            )}
          </div>
          {r.description && <p className="text-lead">{r.description}</p>}
          {r.status === 'published' && (
            <div lang={lang}>
              <ReactionBar recipeId={r.id} stats={r.stats} title={main} />
              <div className="mt-3">
                <VariationActions recipe={r} />
              </div>
            </div>
          )}

          <section aria-labelledby="ing-h" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3" lang={lang}>
              <h2 id="ing-h" className="text-h2">
                {t('recipe.ingredients')}
              </h2>
              <div
                role="radiogroup"
                aria-label={t('recipe.units')}
                className="inline-flex rounded-[22px] bg-surface-sunken p-1"
              >
                {[false, true].map((m) => (
                  <button
                    key={String(m)}
                    type="button"
                    role="radio"
                    aria-checked={metric === m}
                    onClick={() => setMetric(m)}
                    className={cx(
                      'min-h-[40px] rounded-[18px] px-4 text-small font-medium',
                      metric === m ? 'bg-surface shadow-sm' : 'text-text-muted',
                    )}
                  >
                    {m ? t('recipe.metric') : t('recipe.traditional')}
                  </button>
                ))}
              </div>
            </div>
            {r.servings && (
              <div className="flex items-center gap-3" lang={lang}>
                <Users aria-hidden className="size-5 text-text-muted" />
                <span className="text-small font-bold">{t('recipe.servings')}</span>
                <Stepper
                  label={t('recipe.servings')}
                  value={people}
                  min={1}
                  max={200}
                  onChange={(v) => setServings(v ?? base)}
                />
              </div>
            )}
            {grouped(r.ingredients).map((g, gi) => (
              <div key={gi} className="flex flex-col gap-2">
                {g.label && <h3 className="text-small font-bold text-text-muted">{g.label}</h3>}
                <ul className="card divide-y divide-border">
                  {g.lines.map((l) => {
                    const a = amountText(t, l, factor, metric);
                    const dict =
                      l.ingredient_id != null ? lookups.data?.byId.get(l.ingredient_id) : undefined;
                    const otherName = dict ? (lang === 'ml' ? dict.name_ml : dict.name_en) : null;
                    return (
                      <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Sticker slug={lineSticker(l, lookups.data?.byId)} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {l.item_text}
                            {otherName && otherName !== l.item_text && (
                              <span lang={lang} className="font-normal text-text-muted">
                                {' '}
                                · {otherName}
                              </span>
                            )}
                          </p>
                          {l.note && <p className="text-small text-text-muted">{l.note}</p>}
                        </div>
                        <div className="text-right" lang={lang}>
                          <p className="font-semibold whitespace-nowrap">{a.primary}</p>
                          {a.secondary && (
                            <p className="text-small whitespace-nowrap text-text-muted">{a.secondary}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        </div>

        {/* Right on desktop: steps */}
        <section aria-labelledby="steps-h" className="flex flex-col gap-3">
          <h2 id="steps-h" className="text-h2" lang={lang}>
            {t('recipe.steps')}
          </h2>
          <ol className="flex flex-col gap-1">
            {r.steps.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 py-2.5">
                <span className="flex size-[32px] items-center justify-center rounded-pill bg-surface text-small font-semibold shadow-sm">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-2">
                  <p className="text-lead">{s.body}</p>
                  {s.timer_seconds && (
                    <span
                      lang={lang}
                      className="inline-flex min-h-[34px] w-fit items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-small font-semibold"
                    >
                      <Timer aria-hidden className="size-4" />
                      {durationText(t, s.timer_seconds)}
                    </span>
                  )}
                  {s.photo_path && (
                    <img
                      src={photoUrl(s.photo_path, 800)}
                      srcSet={photoSrcSet(s.photo_path)}
                      sizes="(min-width: 1024px) 600px, 90vw"
                      alt=""
                      loading="lazy"
                      className="w-full max-w-md rounded-lg"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
          {r.tips && (
            <aside className="flex items-start gap-3 rounded-lg bg-accent-soft p-4 text-on-accent-soft">
              <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p>{r.tips}</p>
            </aside>
          )}
          {isOwner && r.status === 'published' && (
            <Button
              variant="ghost"
              onClick={() => setStatus.mutate({ id: r.id, status: 'draft' })}
              lang={lang}
            >
              {t('recipe.unpublish')}
            </Button>
          )}
        </section>
      </div>

      {r.status === 'published' && (
        <div lang={lang} className="lg:max-w-(--rb-size-reading-max)">
          <CookedSection recipeId={r.id} count={r.stats?.cooked_count ?? 0} />
          <div className="mt-8">
            <Comments recipeId={r.id} open />
          </div>
        </div>
      )}

      {/* Cooking mode is M5: the main action is shown but explains it isn't ready yet. */}
      <div
        className="fixed inset-x-3.5 bottom-[calc(98px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md lg:bottom-6"
        lang={lang}
      >
        <button
          type="button"
          disabled
          aria-describedby="cook-soon"
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-pill bg-primary font-semibold text-on-primary opacity-90 shadow-lg disabled:cursor-not-allowed"
        >
          <Play aria-hidden className="size-5" />
          {t('recipe.startCooking')}
          <span
            id="cook-soon"
            className="rounded-pill bg-on-primary/20 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase"
          >
            {t('badge.soon')}
          </span>
        </button>
      </div>

      {confirmDelete && (
        <Sheet labelledBy="del-title">
          <div className="flex flex-col gap-4" lang={lang}>
            <h2 id="del-title" className="text-h2">
              {t('recipe.deleteTitle')}
            </h2>
            <p className="text-text-muted">{t('recipe.deleteBody')}</p>
            <Button
              variant="danger"
              full
              loading={del.isPending}
              onClick={async () => {
                await del.mutateAsync(r.id);
                navigate('/me', { replace: true });
              }}
            >
              {t('actions.delete')}
            </Button>
            <Button variant="secondary" full onClick={() => setConfirmDelete(false)}>
              {t('actions.cancel')}
            </Button>
          </div>
        </Sheet>
      )}
    </article>
  );
}
