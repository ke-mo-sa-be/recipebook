import { describe, expect, it } from 'vitest';
import { metricEquivalent, roundMetric, UNIT_CODES, UNIT_PICKER_ORDER, UNITS } from './measures.ts';

describe('units', () => {
  it('the picker lists every unit exactly once', () => {
    expect([...UNIT_PICKER_ORDER].sort()).toEqual([...UNIT_CODES].sort());
  });
  it('only "to taste" is unscalable', () => {
    expect(UNIT_CODES.filter((c) => !UNITS[c].scalable)).toEqual(['to_taste']);
  });
});

describe('metricEquivalent', () => {
  it('1 glass ≈ 200 ml', () => {
    expect(metricEquivalent({ amount: 1, unit: 'glass' })).toEqual({ value: 200, unit: 'ml' });
  });
  it('a pidi is approximate grams, and ranges convert both ends', () => {
    expect(metricEquivalent({ amount: 1, amountMax: 2, unit: 'pidi' })).toEqual({
      value: 30,
      valueMax: 60,
      unit: 'g',
    });
  });
  it('metric units and counts have no equivalent', () => {
    expect(metricEquivalent({ amount: 500, unit: 'g' })).toBeNull();
    expect(metricEquivalent({ amount: 2, unit: 'piece' })).toBeNull();
    expect(metricEquivalent({ amount: null, unit: 'to_taste' })).toBeNull();
  });
});

describe('roundMetric', () => {
  it.each([
    [0.5, 0.5],
    [7.4, 7],
    [47, 45],
    [233, 230],
  ])('%d → %d', (input, out) => expect(roundMetric(input)).toBe(out));
});
