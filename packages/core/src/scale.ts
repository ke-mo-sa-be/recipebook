import { UNITS, type Quantity, type Unit } from './measures.ts';

/**
 * Scale an ingredient amount for a different number of servings.
 * Amounts without a number, and units like "to taste", never change.
 */
export function scaleQuantity(q: Quantity, factor: number): Quantity {
  if (q.amount == null || !q.unit || factor === 1) return q;
  const u: Unit = UNITS[q.unit];
  if (!u.scalable) return q;
  const round = (n: number) => {
    if (u.whole) return Math.max(1, Math.round(n));
    if (u.kind === 'count') return Math.max(0.5, Math.round(n * 2) / 2); // half an onion is fine
    return n;
  };
  return {
    ...q,
    amount: round(q.amount * factor),
    ...(q.amountMax != null ? { amountMax: round(q.amountMax * factor) } : {}),
  };
}

const FRACTIONS: Array<[number, string]> = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [1, ''],
];

/**
 * Human-friendly number: "1½", "¼", "2", "2.4". Kitchen measures read as fractions; other values
 * keep at most one decimal.
 */
export function formatAmount(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  let best = FRACTIONS[0]!;
  for (const f of FRACTIONS) if (Math.abs(frac - f[0]) < Math.abs(frac - best[0])) best = f;
  if (Math.abs(frac - best[0]) <= 0.04) {
    const w = best[0] === 1 ? whole + 1 : whole;
    if (!best[1]) return String(w);
    return w === 0 ? best[1] : `${w}${best[1]}`;
  }
  return String(Math.round(n * 10) / 10);
}

/** "1½" or "2–3" for ranges. */
export function formatRange(amount: number, amountMax?: number | null): string {
  return amountMax != null && amountMax !== amount
    ? `${formatAmount(amount)}–${formatAmount(amountMax)}`
    : formatAmount(amount);
}
