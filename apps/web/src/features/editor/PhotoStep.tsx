import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Headline } from '../../components/ui/Headline.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Polaroid } from '../../components/ui/Polaroid.tsx';
import { PhotoPicker } from '../media/PhotoPicker.tsx';
import { removePhoto, uploadPhoto } from '../media/api.ts';
import { useLookups } from '../recipes/api.ts';

export function PhotoStep({
  recipeId,
  coverPath,
  categoryId,
  onChange,
}: {
  recipeId: string;
  coverPath: string | null;
  categoryId: number | null;
  onChange: (path: string | null) => void;
}) {
  const { t } = useTranslation();
  const lookups = useLookups();
  const category = lookups.data?.categories.find((c) => c.id === categoryId);
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="self-stretch">
        <Headline soft={t('wizard.photo.soft')}>{t('wizard.photo.title')}</Headline>
      </div>
      <Polaroid
        path={coverPath}
        sticker={category?.sticker ?? 'cooking'}
        width={220}
        tilt={-4}
        className="my-2"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PhotoPicker
          label={coverPath ? t('wizard.photo.change') : t('wizard.photo.add')}
          onPick={async (file) => onChange(await uploadPhoto(file, { purpose: 'recipe-cover', recipeId }))}
        />
        {coverPath && (
          <Button
            variant="ghost"
            onClick={async () => {
              await removePhoto({ purpose: 'recipe-cover', recipeId });
              onChange(null);
            }}
          >
            {t('wizard.photo.remove')}
          </Button>
        )}
      </div>
      <p className="flex max-w-sm items-start gap-2 text-small text-text-muted">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-leaf" />
        {t('wizard.photo.privacy')}
      </p>
      {!coverPath && category && (
        <p className="text-small text-text-muted">
          {t('wizard.photo.skip', { category: t(`categories.${category.slug}`) })}
        </p>
      )}
    </div>
  );
}
