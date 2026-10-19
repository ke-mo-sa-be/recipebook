import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Composer } from '../../components/ui/Composer.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { useLookups } from '../recipes/api.ts';
import { FilterSheet } from './FilterSheet.tsx';
import { NoResults, SearchResults } from './SearchResults.tsx';
import {
  EMPTY_SEARCH,
  filterCount,
  readSearch,
  toSearchArgs,
  writeSearch,
  type SearchState,
} from './params.ts';

/** /search: free text in any spelling, filters, and "what's in my kitchen" picks, all kept in the URL. */
export function SearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const lookups = useLookups();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const state = readSearch(params);
  const set = (next: SearchState) => setParams(writeSearch(next));
  const n = filterCount(state);
  const category = lookups.data?.categories.find((c) => c.slug === state.cat);

  // Each active filter as a removable chip.
  const active: Array<{ key: string; label: string; sticker?: string; remove: () => void }> = [
    ...state.with.map((i) => ({
      key: `with-${i}`,
      label: t(`ingredients.${i}`),
      sticker: i,
      remove: () => set({ ...state, with: state.with.filter((x) => x !== i) }),
    })),
    ...(state.cat
      ? [
          {
            key: 'cat',
            label: t(`categories.${state.cat}`),
            sticker: category?.sticker,
            remove: () => set({ ...state, cat: null }),
          },
        ]
      : []),
    ...(state.diet
      ? [{ key: 'diet', label: t(`diet.${state.diet}`), remove: () => set({ ...state, diet: null }) }]
      : []),
    ...(state.time
      ? [
          {
            key: 'time',
            label: t('search.underMinutes', { count: state.time }),
            remove: () => set({ ...state, time: null }),
          },
        ]
      : []),
    ...(state.region
      ? [
          {
            key: 'region',
            label: t(`regions.${state.region}`),
            remove: () => set({ ...state, region: null }),
          },
        ]
      : []),
    ...(state.tag
      ? [{ key: 'tag', label: t(`tags.${state.tag}`), remove: () => set({ ...state, tag: null }) }]
      : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-(--rb-size-reading-max) flex-col gap-4 lg:max-w-(--rb-size-content-max)">
      <PageHeader title={t('search.title')} soft={t('search.soft')} />
      <Composer
        key={state.q}
        label={t('search.placeholder')}
        placeholder={t('search.placeholder')}
        submitLabel={t('nav.search')}
        defaultValue={state.q}
        compact
        onSubmit={(v) => set({ ...state, q: v.trim() })}
        extra={<span className="text-small text-text-muted">{t('search.hint')}</span>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={n > 0} count={n || undefined} onClick={() => setFiltersOpen(true)}>
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal aria-hidden className="size-4" />
            {t('search.filters')}
          </span>
        </Chip>
        {active.map((f) => (
          <Chip key={f.key} active sticker={f.sticker} onClick={f.remove}>
            <span className="inline-flex items-center gap-1">
              {f.label}
              <X aria-hidden className="size-3.5" />
              <span className="sr-only">{t('search.remove')}</span>
            </span>
          </Chip>
        ))}
      </div>
      {/* Wait for the dictionary when kitchen picks need it, so the first query is already the right one. */}
      {(state.with.length === 0 || lookups.data) && (
        <SearchResults
          args={toSearchArgs(state, lookups.data?.dictionary)}
          empty={<NoResults hasFilters={n > 0} onClear={() => set({ ...EMPTY_SEARCH, q: state.q })} />}
        />
      )}
      {filtersOpen && <FilterSheet state={state} onApply={set} onClose={() => setFiltersOpen(false)} />}
    </div>
  );
}
