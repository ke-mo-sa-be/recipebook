import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Headline } from '../../components/ui/Headline.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { useLookups } from '../recipes/api.ts';
import { RecipeCard } from '../recipes/RecipeCard.tsx';
import { useCategoryCounts, useFeatured, useRecipeSearch } from '../search/api.ts';
import { CardSkeletons, GRID } from '../search/SearchResults.tsx';

function SectionHead({ id, title, soft, more }: { id: string; title: string; soft?: string; more?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <Headline as="h2" id={id} soft={soft} className="min-w-0 flex-1">
        {title}
      </Headline>
      {more && (
        <Link to={more} className="inline-flex min-h-tap items-center gap-1 text-small font-semibold">
          {t('home.seeAll')}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  );
}

/** Recipes the admins picked; hidden until there are some. */
export function FeaturedSection() {
  const { t } = useTranslation();
  const featured = useFeatured(3);
  if (!featured.data?.length) return null;
  return (
    <section aria-labelledby="featured-h" className="flex flex-col gap-4">
      <SectionHead id="featured-h" title={t('home.featured.title')} soft={t('home.featured.soft')} />
      <div className={GRID}>
        {featured.data.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </div>
    </section>
  );
}

/** Four recipes that take half an hour or less, and a link to the rest. */
export function QuickSection() {
  const { t } = useTranslation();
  const quick = useRecipeSearch({ max_minutes: 30 }, { pageSize: 4 });
  const rows = quick.data?.pages[0]?.rows ?? [];
  if (quick.isSuccess && rows.length === 0) return null;
  return (
    <section aria-labelledby="quick-h" className="flex flex-col gap-4">
      <SectionHead
        id="quick-h"
        title={t('home.quick.title')}
        soft={t('home.quick.soft')}
        more="/search?time=30"
      />
      {quick.isPending ? (
        <CardSkeletons count={2} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Category stickers with recipe counts; categories without recipes yet stay hidden. */
export function CategorySection() {
  const { t } = useTranslation();
  const lookups = useLookups();
  const counts = useCategoryCounts();
  const cats = (lookups.data?.categories ?? []).filter((c) => (counts.data?.get(c.id) ?? 0) > 0);
  if (!cats.length) return null;
  return (
    <section aria-labelledby="cats-h" className="flex flex-col gap-4">
      <SectionHead id="cats-h" title={t('home.categories.title')} soft={t('home.categories.soft')} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((c) => (
          <li key={c.slug}>
            <Link
              to={`/c/${c.slug}`}
              className="card flex min-h-tap items-center gap-3 p-3 transition-transform active:scale-[0.98]"
            >
              <Sticker slug={c.sticker} size={44} />
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold wrap-break-word">{t(`categories.${c.slug}`)}</span>
                <span className="text-small text-text-muted">
                  {t('category.count', { count: counts.data?.get(c.id) ?? 0 })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
