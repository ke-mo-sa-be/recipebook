import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button.tsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.tsx';
import { RecipeCard } from '../recipes/RecipeCard.tsx';
import { useRecipeSearch } from './api.ts';
import type { SearchArgs } from './params.ts';

export const GRID = 'grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3';

/** Skeleton cards shaped like RecipeCard, so the page doesn't jump when results arrive. */
export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className={GRID} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex flex-col items-center gap-3 px-4 pt-3 pb-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-[72px] w-40 rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Results grid with its count, a "Show more" button, and loading / empty / error states. */
export function SearchResults({ args, empty }: { args: SearchArgs; empty: ReactNode }) {
  const { t } = useTranslation();
  const search = useRecipeSearch(args);
  if (search.isPending) {
    return (
      <div role="status" aria-label={t('search.loading')}>
        <CardSkeletons />
      </div>
    );
  }
  if (search.isError) return <ErrorState onRetry={() => void search.refetch()} />;
  const rows = search.data.pages.flatMap((p) => p.rows);
  const total = search.data.pages[0]?.total ?? 0;
  if (rows.length === 0) return <>{empty}</>;
  return (
    <section aria-labelledby="results-h" className="flex flex-col gap-3">
      <h2 id="results-h" className="text-small font-semibold text-text-muted" aria-live="polite">
        {t('search.results', { count: total })}
      </h2>
      <div className={GRID}>
        {rows.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </div>
      {search.hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          loading={search.isFetchingNextPage}
          onClick={() => void search.fetchNextPage()}
        >
          {t('search.more')}
        </Button>
      )}
    </section>
  );
}

export function NoResults({ onClear, hasFilters }: { onClear?: () => void; hasFilters: boolean }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      stickers={['magnifying-glass-tilted-left', 'herb', 'coconut']}
      title={t('search.empty.title')}
      body={hasFilters ? t('search.empty.filters') : t('search.empty.body')}
      action={
        hasFilters && onClear ? (
          <Button variant="secondary" onClick={onClear}>
            {t('search.clearAll')}
          </Button>
        ) : undefined
      }
    />
  );
}
