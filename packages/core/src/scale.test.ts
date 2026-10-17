import { describe, expect, it } from 'vitest';
import { formatAmount, formatRange, scaleQuantity } from './scale.ts';

describe('scaleQuantity', () => {
  it('doubles numeric amounts when servings go 4 → 8', () => {
    expect(scaleQuantity({ amount: 1, unit: 'glass' }, 2)).toEqual({ amount: 2, unit: 'glass' });
    expect(scaleQuantity({ amount: 0.5, unit: 'kg' }, 2)).toEqual({ amount: 1, unit: 'kg' });
  });
  it('never scales "to taste" or amounts without a number', () => {
    expect(scaleQuantity({ amount: null, unit: 'to_taste' }, 2)).toEqual({ amount: null, unit: 'to_taste' });
    expect(scaleQuantity({ amount: null, unit: null }, 3)).toEqual({ amount: null, unit: null });
  });
  it('rounds pinches to whole pinches and counts to halves', () => {
    expect(scaleQuantity({ amount: 1, unit: 'pinch' }, 0.5).amount).toBe(1);
    expect(scaleQuantity({ amount: 3, unit: 'piece' }, 0.5).amount).toBe(1.5);
    expect(scaleQuantity({ amount: 1, unit: 'piece' }, 0.25).amount).toBe(0.5);
  });
  it('scales both ends of a range', () => {
    expect(scaleQuantity({ amount: 2, amountMax: 3, unit: 'piece' }, 2)).toEqual({
      amount: 4,
      amountMax: 6,
      unit: 'piece',
    });
  });
});

describe('formatAmount', () => {
  it.each([
    [1, '1'],
    [0.5, '½'],
    [1.5, '1½'],
    [0.25, '¼'],
    [0.333, '⅓'],
    [2.75, '2¾'],
    [0.99, '1'],
    [2.4, '2.4'],
  ])('%d → %s', (n, s) => expect(formatAmount(n)).toBe(s));
  it('formats ranges', () => {
    expect(formatRange(2, 3)).toBe('2–3');
    expect(formatRange(2, 2)).toBe('2');
  });
});
