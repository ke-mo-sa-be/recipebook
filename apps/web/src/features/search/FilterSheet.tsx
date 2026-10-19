import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { useLookups } from '../recipes/api.ts';
import { DIETS, TAGS, TIME_LIMITS, type SearchState } from './params.ts';

function Group({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="text-small font-bold">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

/** All filters in one sheet; nothing applies until "Show recipes", so the results don't jump around. */
export function FilterSheet({
  state,
  onApply,
  onClose,
}: {
  state: SearchState;
  onApply: (next: SearchState) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const lookups = useLookups();
  const [draft, setDraft] = useState(state);
  const toggle = <K extends 'cat' | 'diet' | 'time' | 'region' | 'tag'>(key: K, value: SearchState[K]) =>
    setDraft((d) => ({ ...d, [key]: d[key] === value ? null : value }));

  return (
    <Sheet labelledBy="filters-h">
      <div
        className="flex flex-col gap-5"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <h2 id="filters-h" className="text-h2">
          {t('search.filters')}
        </h2>
        <Group id="f-cat" title={t('search.filter.category')}>
          {lookups.data?.categories.map((c) => (
            <Chip
              key={c.slug}
              sticker={c.sticker}
              active={draft.cat === c.slug}
              onClick={() => toggle('cat', c.slug)}
            >
              {t(`categories.${c.slug}`)}
            </Chip>
          ))}
        </Group>
        <Group id="f-diet" title={t('search.filter.diet')}>
          {DIETS.map((d) => (
            <Chip key={d} active={draft.diet === d} onClick={() => toggle('diet', d)}>
              {t(`diet.${d}`)}
            </Chip>
          ))}
        </Group>
        <Group id="f-time" title={t('search.filter.time')}>
          {TIME_LIMITS.map((m) => (
            <Chip key={m} active={draft.time === m} onClick={() => toggle('time', m)}>
              {t('search.underMinutes', { count: m })}
            </Chip>
          ))}
        </Group>
        <Group id="f-region" title={t('search.filter.region')}>
          {lookups.data?.regions.map((r) => (
            <Chip key={r.slug} active={draft.region === r.slug} onClick={() => toggle('region', r.slug)}>
              {t(`regions.${r.slug}`)}
            </Chip>
          ))}
        </Group>
        <Group id="f-tag" title={t('search.filter.tag')}>
          {TAGS.map((tag) => (
            <Chip key={tag} active={draft.tag === tag} onClick={() => toggle('tag', tag)}>
              {t(`tags.${tag}`)}
            </Chip>
          ))}
        </Group>
        {/* Stacked on phones (long Malayalam labels at large text), side by side from tablet width. */}
        <div className="sticky bottom-0 -mx-6 flex flex-col-reverse gap-2 bg-bg px-6 pt-2 sm:flex-row sm:gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() =>
              setDraft({ ...draft, cat: null, diet: null, time: null, region: null, tag: null, with: [] })
            }
          >
            {t('search.clearAll')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {t('search.show')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
