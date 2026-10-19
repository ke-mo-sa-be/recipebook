import { describe, expect, it } from 'vitest';
import { filterCount, readSearch, toSearchArgs, writeSearch } from './params.ts';
import type { DictionaryItem } from '../recipes/api.ts';

const read = (qs: string) => readSearch(new URLSearchParams(qs));

describe('search URL state', () => {
  it('reads and writes the same state', () => {
    const qs = 'q=meen+curry&cat=seafood&diet=nonveg&time=30&region=central&tag=onam&with=coconut%2Conion';
    const s = read(qs);
    expect(s).toEqual({
      q: 'meen curry',
      cat: 'seafood',
      diet: 'nonveg',
      time: 30,
      region: 'central',
      tag: 'onam',
      with: ['coconut', 'onion'],
    });
    expect(read(writeSearch(s))).toEqual(s);
    expect(filterCount(s)).toBe(7);
  });

  it('ignores anything it does not know', () => {
    expect(read('diet=keto&time=45&cat=Bad%20Slug&with=dragonfruit,coconut,coconut')).toMatchObject({
      diet: null,
      time: null,
      cat: null,
      with: ['coconut'],
    });
  });

  it('turns kitchen items into groups of dictionary ids', () => {
    const dict = [
      { id: 1, slug: 'coconut' },
      { id: 2, slug: 'grated-coconut' },
      { id: 3, slug: 'shallots' },
    ] as DictionaryItem[];
    expect(toSearchArgs(read('with=coconut,onion,tomato&time=15'), dict)).toEqual({
      max_minutes: 15,
      with_groups: [[1, 2], [3]],
    });
  });
});
