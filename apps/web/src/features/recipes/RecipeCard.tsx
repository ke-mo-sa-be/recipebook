import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { currentLang } from '../../i18n/index.ts';
import { StickerRow } from '../../components/ui/Sticker.tsx';
import { Polaroid } from '../../components/ui/Polaroid.tsx';
import { DietMark } from './DietMark.tsx';
import { lineSticker } from './format.ts';
import { titles, useLookups, type RecipeCardData } from './api.ts';

/** v2 recipe card: the cook's photo as a polaroid, or the main ingredients as a sticker row. */
export function RecipeCard({ recipe, to }: { recipe: RecipeCardData; to?: string }) {
  const { t } = useTranslation();
  const lookups = useLookups();
  const lang = currentLang();
  const { main, other } = titles(recipe, lang);
  const category = lookups.data?.categories.find((c) => c.id === recipe.category_id);
  const stickers = [...recipe.ingredients]
    .sort((a, b) => a.position - b.position)
    .filter((i) => i.ingredient_id != null)
    .map((i) => lineSticker(i, lookups.data?.byId))
    .filter((s, i, all) => all.indexOf(s) === i && s !== 'salt' && s !== 'tumbler-glass');
  return (
    <Link
      to={to ?? `/r/${recipe.id}/${recipe.slug}`}
      className="card flex flex-col items-center gap-2 px-4 pt-3 pb-4 text-center transition-transform active:scale-[0.99]"
    >
      <div className="flex w-full items-center justify-between text-small text-text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden className="size-4" />
          {recipe.total_minutes ? t('recipe.minutes', { count: recipe.total_minutes }) : t('recipe.noTime')}
        </span>
        {recipe.diet && <DietMark diet={recipe.diet} />}
      </div>
      <div className="flex min-h-[72px] items-center justify-center py-1">
        {recipe.cover_path ? (
          <Polaroid path={recipe.cover_path} sticker={category?.sticker ?? 'cooking'} width={96} tilt={-4} />
        ) : (
          <StickerRow
            slugs={stickers.length ? stickers : [category?.sticker ?? 'cooking']}
            size={48}
            max={4}
          />
        )}
      </div>
      <h3 className="text-h3" lang={recipe.content_lang}>
        {main || t('recipe.untitled')}
      </h3>
      {(other || category) && (
        <p className="-mt-1 text-small text-text-muted">
          {other ?? (category ? t(`categories.${category.slug}`) : '')}
        </p>
      )}
    </Link>
  );
}
