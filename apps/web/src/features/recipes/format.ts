import type { TFunction } from 'i18next';
import {
  formatRange,
  metricEquivalent,
  roundMetric,
  scaleQuantity,
  UNITS,
  type UnitCode,
} from '@recipebook/core';
import type { DictionaryItem, IngredientLine } from './api.ts';

const GROUP_STICKERS: Record<string, string> = {
  spice: 'jar',
  vegetable: 'leafy-green',
  fruit: 'red-apple',
  grain: 'cooked-rice',
  pulse: 'beans',
  dairy: 'glass-of-milk',
  meat: 'cut-of-meat',
  seafood: 'fish',
  oil: 'jar',
  sweetener: 'honey-pot',
  nut: 'peanuts',
  herb: 'herb',
  other: 'spoon',
};

/** The sticker for an ingredient line: its dictionary sticker, its group's, or a spoon. */
export function lineSticker(
  line: Pick<IngredientLine, 'ingredient_id'>,
  byId: Map<number, DictionaryItem> | undefined,
): string {
  const item = line.ingredient_id != null ? byId?.get(line.ingredient_id) : undefined;
  return item?.sticker ?? (item ? GROUP_STICKERS[item.grp] : undefined) ?? 'spoon';
}

export function unitLabel(t: TFunction, unit: UnitCode | null, amount: number | null) {
  if (!unit || unit === 'to_taste') return unit ? t('units.to_taste') : '';
  return t(`units.${unit}`, { count: amount != null && amount > 1 ? 2 : 1 });
}

/**
 * Text for an ingredient amount after scaling. In metric mode traditional measures lead with the
 * approximate metric value ("≈ 200 ml") and keep the original as secondary text, and vice versa.
 */
export function amountText(t: TFunction, line: IngredientLine, factor: number, metric: boolean) {
  const q = scaleQuantity({ amount: line.amount, amountMax: line.amount_max, unit: line.unit_code }, factor);
  if (q.amount == null) return { primary: q.unit === 'to_taste' ? t('units.to_taste') : '', secondary: null };
  const traditional =
    `${formatRange(q.amount, q.amountMax)} ${unitLabel(t, q.unit, q.amountMax ?? q.amount)}`.trim();
  const m = metricEquivalent(q);
  if (!m) return { primary: traditional, secondary: null };
  const unit = t(`units.${m.unit}`, { count: 2 });
  const approx = `≈ ${roundMetric(m.value)}${m.valueMax != null ? `–${roundMetric(m.valueMax)}` : ''} ${unit}`;
  return metric ? { primary: approx, secondary: traditional } : { primary: traditional, secondary: approx };
}

/** Units that can be scaled are only those with a number; for the UI hint. */
export function isScalable(unit: UnitCode | null) {
  return unit != null && UNITS[unit].scalable;
}
