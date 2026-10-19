import { useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Chip } from '../../components/ui/Chip.tsx';
import { Headline } from '../../components/ui/Headline.tsx';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { Skeleton } from '../../components/ui/States.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.tsx';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLookups } from '../recipes/api.ts';
import { useCategoryCounts } from './api.ts';
import { DIETS, readSearch, toSearchArgs, writeSearch } from './params.ts';
import { NoResults, SearchResults } from './SearchResults.tsx';

/** /c/:slug: one category's recipes, with quick food-type and time chips. */
export function CategoryPage() {
  const { slug = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lookups = useLookups();
  const counts = useCategoryCounts();
  const [params, setParams] = useSearchParams();
  if (lookups.isPending) return <Skeleton className="h-48 w-full" />;
  const category = lookups.data?.categories.find((c) => c.slug === slug);
  if (!category) return <NotFoundPage />;

  const state = { ...readSearch(params), cat: slug, q: '' };
  const set = (next: typeof state) => setParams(writeSearch({ ...next, cat: null }));
  const total = counts.data?.get(category.id) ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <IconButton
          label={t('actions.back')}
          icon={<ChevronLeft aria-hidden />}
          onClick={() => navigate(-1)}
        />
        <span className="lg:hidden">
          <ThemeToggle />
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Sticker slug={category.sticker} size={72} tilt={-6} />
        <Headline soft={t('category.count', { count: total })}>{t(`categories.${slug}`)}</Headline>
      </div>
      <div className="flex flex-wrap gap-2">
        {DIETS.map((d) => (
          <Chip
            key={d}
            active={state.diet === d}
            onClick={() => set({ ...state, diet: state.diet === d ? null : d })}
          >
            {t(`diet.${d}`)}
          </Chip>
        ))}
        <Chip
          active={state.time === 30}
          onClick={() => set({ ...state, time: state.time === 30 ? null : 30 })}
        >
          {t('search.underMinutes', { count: 30 })}
        </Chip>
      </div>
      <SearchResults
        args={toSearchArgs(state)}
        empty={
          <NoResults
            hasFilters={Boolean(state.diet || state.time)}
            onClear={() => set({ ...state, diet: null, time: null })}
          />
        }
      />
    </div>
  );
}
