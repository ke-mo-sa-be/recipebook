import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Composer } from '../../components/ui/Composer.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { EmptyState } from '../../components/ui/States.tsx';
import { KITCHEN_ITEMS, type KitchenItem } from '../home/kitchen.ts';

// Results arrive with recipes (M3). The page already accepts ?q= and ?with= so links from Home work.
export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const withItems = (params.get('with') ?? '')
    .split(',')
    .filter((i): i is KitchenItem => (KITCHEN_ITEMS as readonly string[]).includes(i));

  return (
    <div className="mx-auto flex w-full max-w-(--rb-size-reading-max) flex-col gap-4">
      <PageHeader title={t('search.title')} soft={t('search.soft')} />
      <Composer
        key={q}
        label={t('search.placeholder')}
        placeholder={t('search.placeholder')}
        submitLabel={t('nav.search')}
        defaultValue={q}
        compact
        onSubmit={(v) => navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/search')}
        extra={<span className="text-small text-text-muted">{t('search.hint')}</span>}
      />
      {withItems.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={t('search.withLabel')}>
          {withItems.map((i) => (
            <Chip key={i} active sticker={i}>
              {t(`ingredients.${i}`)}
            </Chip>
          ))}
        </div>
      )}
      <EmptyState
        stickers={['magnifying-glass-tilted-left', 'herb', 'coconut']}
        title={t('search.soon.title')}
        body={q ? t('search.soon.bodyQuery', { q }) : t('search.soon.body')}
      />
    </div>
  );
}
