import { describe, expect, it } from 'vitest';
import { manglishKey, normalizeName, searchByName } from './manglish.ts';

const DICT = [
  { name_en: 'Cumin', name_ml: 'ജീരകം', aliases: ['jeerakam', 'jeera'] },
  { name_en: 'Malabar tamarind', name_ml: 'കുടംപുളി', aliases: ['kudampuli', 'fish tamarind'] },
  { name_en: 'Shallots', name_ml: 'ചുവന്നുള്ളി', aliases: ['chuvannulli', 'small onion'] },
  { name_en: 'Tomato', name_ml: 'തക്കാളി', aliases: ['thakkali'] },
  { name_en: 'Raw banana', name_ml: 'വാഴക്ക', aliases: ['vazhakka', 'plantain'] },
];
const names = (q: string) => searchByName(q, DICT).map((i) => i.name_en);

describe('normalizeName', () => {
  it('lower-cases, strips accents and joiners', () => {
    expect(normalizeName('  Jeéra—Powder ')).toBe('jeera powder');
    expect(normalizeName('ചുവന്നു‍ള്ളി')).toBe('ചുവന്നുള്ളി');
  });
});

describe('manglishKey', () => {
  it('folds common spelling variants together', () => {
    expect(manglishKey('jeeragam')).toBe(manglishKey('jeerakam'));
    expect(manglishKey('thakkali')).toBe(manglishKey('takali'));
    expect(manglishKey('valakka')).toBe(manglishKey('vazhakka'));
  });
});

describe('searchByName', () => {
  it.each([
    ['jeerakam', 'Cumin'],
    ['jeeragam', 'Cumin'],
    ['ജീരകം', 'Cumin'],
    ['cumin', 'Cumin'],
    ['jeer', 'Cumin'],
    ['kudampuli', 'Malabar tamarind'],
    ['kodampuli', 'Malabar tamarind'],
    ['small onion', 'Shallots'],
    ['tomatto', 'Tomato'],
    ['valakka', 'Raw banana'],
  ])('%s → %s first', (q, expected) => expect(names(q)[0]).toBe(expected));

  it('returns nothing for empty or unrelated queries', () => {
    expect(names('')).toEqual([]);
    expect(names('xyzzy')).toEqual([]);
  });
});
