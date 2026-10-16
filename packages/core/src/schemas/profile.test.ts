import { describe, expect, it } from 'vitest';
import { handleSchema, profileUpdateSchema } from './profile.ts';

describe('handleSchema', () => {
  it('lower-cases and accepts letters, digits and underscore', () => {
    expect(handleSchema.parse('  Ammini_Cooks ')).toBe('ammini_cooks');
  });
  it.each(['ab', 'a'.repeat(31), 'has space', 'dash-ed', 'മലയാളം'])('rejects %j', (bad) => {
    expect(handleSchema.safeParse(bad).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  const valid = {
    handle: 'amma',
    display_name: 'Amma',
    bio: null,
    district: 'ekm',
    preferred_lang: 'ml',
    text_size: 'large',
  } as const;

  it('accepts a valid profile', () => {
    expect(profileUpdateSchema.parse(valid)).toEqual(valid);
  });
  it('rejects an unknown district', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, district: 'goa' }).success).toBe(false);
  });
  it('rejects an empty display name', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, display_name: '   ' }).success).toBe(false);
  });
});
