import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { EmptyState, ErrorState } from '../../components/ui/States.tsx';
import { useSaved } from '../community/api.ts';
import { RecipeCard } from '../recipes/RecipeCard.tsx';
import { CardSkeletons, GRID } from '../search/SearchResults.tsx';

/** Recipes you saved, newest first. Saves are private to you. */
export function SavedPage() {
  const { t } = useTranslation();
  const saved = useSaved();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('saved.title')}
        soft={saved.data?.length ? t('saved.count', { count: saved.data.length }) : t('saved.soft')}
      />
      {saved.isPending ? (
        <CardSkeletons count={4} />
      ) : saved.isError ? (
        <ErrorState onRetry={() => void saved.refetch()} />
      ) : saved.data.length === 0 ? (
        <EmptyState
          stickers={['bookmark', 'red-heart']}
          title={t('saved.empty.title')}
          body={t('saved.empty.body')}
        />
      ) : (
        <div className={GRID}>
          {saved.data.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}
