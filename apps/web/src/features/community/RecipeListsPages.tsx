import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { EmptyState, ErrorState } from '../../components/ui/States.tsx';
import { currentLang } from '../../i18n/index.ts';
import { RecipeCard } from '../recipes/RecipeCard.tsx';
import { titles, useRecipe } from '../recipes/api.ts';
import { CardSkeletons, GRID } from '../search/SearchResults.tsx';
import { CookedTile } from './CookedSection.tsx';
import { useCookedPosts, useVariations } from './cooked.ts';

function useRecipeTitle(id: string) {
  const recipe = useRecipe(id);
  return recipe.data ? titles(recipe.data, currentLang()).main : '';
}

/** /r/:id/cooked: every "I cooked this" photo for a recipe. */
export function CookedGalleryPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const title = useRecipeTitle(id);
  const posts = useCookedPosts(id, 200);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader back title={t('cooked.title')} soft={title} />
      {posts.isPending ? (
        <CardSkeletons count={4} />
      ) : posts.isError ? (
        <ErrorState onRetry={() => void posts.refetch()} />
      ) : posts.data.length === 0 ? (
        <EmptyState
          stickers={['camera', 'steaming-bowl']}
          title={t('cooked.emptyTitle')}
          body={t('cooked.empty')}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {posts.data.map((p) => (
            <li key={p.id}>
              <CookedTile post={p} recipeId={id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** /r/:id/variations: everyone's published versions of a recipe. */
export function VariationsPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const title = useRecipeTitle(id);
  const list = useVariations(id);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader back title={t('variations.title')} soft={title} />
      {list.isPending ? (
        <CardSkeletons count={4} />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState
          stickers={['shrimp', 'fish']}
          title={t('variations.emptyTitle')}
          body={t('variations.empty')}
        />
      ) : (
        <div className={GRID}>
          {list.data.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}
