import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { GitFork } from 'lucide-react';
import { Button } from '../../components/ui/Button.tsx';
import { currentLang } from '../../i18n/index.ts';
import { errorKey } from '../../lib/appError.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import { titles, type Recipe } from '../recipes/api.ts';
import { useMakeVariation } from './cooked.ts';

/** "Based on …" under the title of a version, or "the original is no longer available". */
export function BasedOn({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  if (!recipe.is_variation) return null;
  const p = recipe.parent;
  if (!p || p.status !== 'published') {
    return <p className="text-small text-text-muted">{t('variations.originalRemoved')}</p>;
  }
  const { main } = titles(p, currentLang());
  return (
    <p className="text-small text-text-muted">
      {t('variations.basedOn')}{' '}
      <Link to={`/r/${p.id}/${p.slug}`} className="font-semibold text-text underline underline-offset-4">
        {main}
      </Link>
      {p.author && ` · ${t('variations.by', { name: p.author.display_name })}`}
    </p>
  );
}

/** "Make my version" (copies into your drafts) and the link to everyone's versions. */
export function VariationActions({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const uid = useUserId();
  const navigate = useNavigate();
  const location = useLocation();
  const make = useMakeVariation();
  const count = recipe.stats?.variation_count ?? 0;
  const mine = recipe.author_id === uid;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!mine && (
        <Button
          variant="secondary"
          icon={<GitFork aria-hidden />}
          loading={make.isPending}
          onClick={() =>
            uid
              ? make.mutate(recipe.id, { onSuccess: (id) => navigate(`/edit/${id}/basics?from=variation`) })
              : navigate(`/auth/sign-in?next=${encodeURIComponent(location.pathname)}`)
          }
        >
          {t('variations.make')}
        </Button>
      )}
      {count > 0 && (
        <Link
          to={`/r/${recipe.id}/variations`}
          className="min-h-tap text-small font-semibold underline underline-offset-4"
        >
          {t('variations.count', { count })}
        </Link>
      )}
      {make.isError && (
        <p role="alert" className="text-small text-danger">
          {t(errorKey(make.error))}
        </p>
      )}
    </div>
  );
}
