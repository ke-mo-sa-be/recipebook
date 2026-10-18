import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react';
import { searchByName, UNIT_PICKER_ORDER, type Lang, type UnitCode } from '@recipebook/core';
import { Headline } from '../../components/ui/Headline.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { Stepper } from '../../components/ui/Stepper.tsx';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { EmptyState } from '../../components/ui/States.tsx';
import { lineSticker } from '../recipes/format.ts';
import { useLookups, type DictionaryItem, type IngredientLine } from '../recipes/api.ts';

/** Sensible first guess for a new line; the cook adjusts it. */
const DEFAULT_UNIT: Record<string, { unit: UnitCode | null; amount: number | null }> = {
  spice: { unit: 'tsp', amount: 1 },
  herb: { unit: 'sprig', amount: 1 },
  oil: { unit: 'tbsp', amount: 1 },
  meat: { unit: 'kg', amount: 0.5 },
  seafood: { unit: 'kg', amount: 0.5 },
  vegetable: { unit: 'piece', amount: 1 },
  fruit: { unit: 'piece', amount: 1 },
  dairy: { unit: 'cup', amount: 1 },
  grain: { unit: 'cup', amount: 1 },
  pulse: { unit: 'cup', amount: 0.5 },
  nut: { unit: 'tbsp', amount: 1 },
  sweetener: { unit: 'tbsp', amount: 1 },
  other: { unit: 'cup', amount: 1 },
};

/** Step size that suits the amount: quarters for small spoon-ish amounts, whole numbers later. */
function amountStep(v: number, dir: 1 | -1): number {
  const x = dir === -1 ? v - 0.001 : v;
  if (x < 1) return 0.25;
  if (x < 5) return 0.5;
  if (x < 20) return 1;
  if (x < 100) return 5;
  return 50;
}

export function IngredientsStep({
  lang,
  lines,
  setLines,
}: {
  lang: Lang;
  lines: IngredientLine[];
  setLines: (l: IngredientLine[]) => void;
}) {
  const { t } = useTranslation();
  const lookups = useLookups();
  const [q, setQ] = useState('');
  const results = useMemo(
    () => (q.trim() ? searchByName(q, lookups.data?.dictionary ?? [], 6) : []),
    [q, lookups.data],
  );

  function add(item: DictionaryItem | null) {
    const name = item ? (lang === 'ml' ? item.name_ml : item.name_en) : q.trim();
    if (!name) return;
    const d =
      item?.slug === 'salt'
        ? { unit: 'to_taste' as const, amount: null }
        : DEFAULT_UNIT[item?.grp ?? 'other']!;
    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        group_label: null,
        amount: d.amount,
        amount_max: null,
        unit_code: d.unit,
        ingredient_id: item?.id ?? null,
        item_text: name,
        note: null,
      },
    ]);
    setQ('');
  }
  const update = (i: number, patch: Partial<IngredientLine>) =>
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...lines];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    setLines(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <Headline soft={t('wizard.ingredients.soft')}>{t('wizard.ingredients.title')}</Headline>
      <div className="card flex flex-col gap-3 p-3.5 shadow-md">
        <label className="flex items-center gap-2 px-1">
          <Search aria-hidden className="size-5 text-text-muted" />
          <span className="sr-only">{t('wizard.ingredients.searchLabel')}</span>
          <input
            type="search"
            value={q}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(results[0] ?? null);
              }
            }}
            placeholder={t('wizard.ingredients.search')}
            className="min-h-tap w-full bg-transparent text-lead outline-none placeholder:text-text-muted"
          />
        </label>
        {q.trim() && (
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {results.map((r) => (
              <Chip key={r.id} sticker={r.sticker ?? undefined} onClick={() => add(r)}>
                <span lang="ml">{r.name_ml}</span> · {r.name_en}
              </Chip>
            ))}
            <Chip onClick={() => add(null)}>
              <span className="inline-flex items-center gap-1">
                <Plus aria-hidden className="size-4" />
                {t('wizard.ingredients.useAsTyped', { text: q.trim() })}
              </span>
            </Chip>
          </div>
        )}
      </div>

      {lines.length === 0 ? (
        <EmptyState
          stickers={['coconut', 'onion', 'hot-pepper']}
          title={t('wizard.ingredients.emptyTitle')}
          body={t('wizard.ingredients.empty')}
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {lines.map((l, i) => (
            <li key={l.id} className="card flex flex-col gap-3 p-3">
              <div className="flex items-center gap-2">
                <Sticker slug={lineSticker(l, lookups.data?.byId)} size={44} />
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{t('wizard.ingredients.name')}</span>
                  <input
                    value={l.item_text}
                    lang={lang}
                    maxLength={120}
                    onChange={(e) => update(i, { item_text: e.target.value })}
                    className="min-h-tap w-full rounded-md bg-transparent px-1 font-semibold outline-none focus-visible:bg-surface-sunken"
                  />
                </label>
                <IconButton
                  label={t('wizard.moveUp')}
                  icon={<ArrowUp aria-hidden />}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="shadow-none disabled:opacity-30"
                />
                <IconButton
                  label={t('wizard.moveDown')}
                  icon={<ArrowDown aria-hidden />}
                  disabled={i === lines.length - 1}
                  onClick={() => move(i, 1)}
                  className="shadow-none disabled:opacity-30"
                />
                <IconButton
                  label={t('wizard.remove')}
                  icon={<Trash2 aria-hidden />}
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  className="shadow-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {l.unit_code !== 'to_taste' && (
                  <Stepper
                    label={t('wizard.ingredients.amount')}
                    value={l.amount}
                    step={amountStep}
                    min={0.25}
                    allowEmpty
                    onChange={(v) => update(i, { amount: v, amount_max: null })}
                  />
                )}
                <label className="flex-1">
                  <span className="sr-only">{t('wizard.ingredients.unit')}</span>
                  <select
                    value={l.unit_code ?? ''}
                    onChange={(e) => {
                      const unit = (e.target.value || null) as UnitCode | null;
                      update(i, {
                        unit_code: unit,
                        ...(unit === 'to_taste'
                          ? { amount: null, amount_max: null }
                          : l.amount == null
                            ? { amount: 1 }
                            : {}),
                      });
                    }}
                    className="min-h-[52px] w-full rounded-md border-[1.5px] border-border bg-surface px-3"
                  >
                    <option value="">{t('units.none')}</option>
                    {UNIT_PICKER_ORDER.map((u) => (
                      <option key={u} value={u}>
                        {u === 'to_taste' ? t('units.to_taste') : t(`units.${u}`, { count: 2 })}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="sr-only">{t('wizard.ingredients.note')}</span>
                <input
                  value={l.note ?? ''}
                  lang={lang}
                  maxLength={120}
                  placeholder={t('wizard.ingredients.notePlaceholder')}
                  onChange={(e) => update(i, { note: e.target.value || null })}
                  className="min-h-tap w-full rounded-md border-[1.5px] border-dashed border-border bg-transparent px-3 text-small placeholder:text-text-muted"
                />
              </label>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
