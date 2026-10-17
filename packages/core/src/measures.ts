// Units of measure. This table is the single source: the seed generator writes the `units` table
// from it, and the web app uses it to scale and convert. Metric values for traditional Kerala
// measures are APPROXIMATE household averages, shown with "≈" (reviewed by native cooks in M2).

export type UnitKind = 'volume' | 'mass' | 'count' | 'vague';

export type Unit = {
  kind: UnitKind;
  /** false: never scaled (e.g. "to taste") */
  scalable: boolean;
  /** Approximate millilitres per 1 unit (volume units). */
  ml?: number;
  /** Approximate grams per 1 unit (mass units). */
  g?: number;
  /** Kerala household measure → show the metric equivalent next to it. */
  traditional?: boolean;
  /** Round scaled amounts to whole units (you can't add 1.3 pinches). */
  whole?: boolean;
};

export const UNITS = {
  glass: { kind: 'volume', scalable: true, ml: 200, traditional: true },
  cup: { kind: 'volume', scalable: true, ml: 240, traditional: true },
  tea_cup: { kind: 'volume', scalable: true, ml: 150, traditional: true },
  ladle: { kind: 'volume', scalable: true, ml: 60, traditional: true },
  tbsp: { kind: 'volume', scalable: true, ml: 15 },
  tsp: { kind: 'volume', scalable: true, ml: 5 },
  pidi: { kind: 'mass', scalable: true, g: 30, traditional: true },
  pinch: { kind: 'mass', scalable: true, g: 0.5, traditional: true, whole: true },
  g: { kind: 'mass', scalable: true, g: 1 },
  kg: { kind: 'mass', scalable: true, g: 1000 },
  ml: { kind: 'volume', scalable: true, ml: 1 },
  l: { kind: 'volume', scalable: true, ml: 1000 },
  piece: { kind: 'count', scalable: true },
  sprig: { kind: 'count', scalable: true },
  inch: { kind: 'count', scalable: true },
  to_taste: { kind: 'vague', scalable: false },
} as const satisfies Record<string, Unit>;

export type UnitCode = keyof typeof UNITS;
export const UNIT_CODES = Object.keys(UNITS) as UnitCode[];
/** Display order in the unit picker: Kerala measures first. */
export const UNIT_PICKER_ORDER: UnitCode[] = [
  'glass',
  'cup',
  'tea_cup',
  'pidi',
  'pinch',
  'ladle',
  'tsp',
  'tbsp',
  'piece',
  'sprig',
  'inch',
  'g',
  'kg',
  'ml',
  'l',
  'to_taste',
];

export function isUnitCode(v: unknown): v is UnitCode {
  return typeof v === 'string' && v in UNITS;
}

export type Quantity = { amount: number | null; amountMax?: number | null; unit: UnitCode | null };

/** Approximate metric equivalent for traditional or spoon measures, or null if not meaningful. */
export function metricEquivalent(q: Quantity): { value: number; valueMax?: number; unit: 'ml' | 'g' } | null {
  if (q.amount == null || !q.unit) return null;
  const u: Unit = UNITS[q.unit];
  if (u.ml && q.unit !== 'ml' && q.unit !== 'l') {
    return {
      value: q.amount * u.ml,
      ...(q.amountMax != null ? { valueMax: q.amountMax * u.ml } : {}),
      unit: 'ml',
    };
  }
  if (u.g && q.unit !== 'g' && q.unit !== 'kg') {
    return {
      value: q.amount * u.g,
      ...(q.amountMax != null ? { valueMax: q.amountMax * u.g } : {}),
      unit: 'g',
    };
  }
  return null;
}

/** Round a metric value to something a cook would measure. */
export function roundMetric(value: number): number {
  if (value < 1) return Math.round(value * 10) / 10;
  if (value < 20) return Math.round(value);
  if (value < 100) return Math.round(value / 5) * 5;
  return Math.round(value / 10) * 10;
}
