import { describe, expect, it } from 'vitest';
import { safeNextPath, signUpSchema } from './auth.ts';

describe('safeNextPath', () => {
  it.each([
    ['/settings', '/settings'],
    ['/u/amma?tab=recipes', '/u/amma?tab=recipes'],
    [null, '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['javascript:alert(1)', '/'],
  ])('%j → %j', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe('signUpSchema', () => {
  it('normalises email and accepts a valid sign-up', () => {
    const r = signUpSchema.parse({
      displayName: ' Ammini ',
      email: ' Ammini@Example.COM ',
      password: 'curry-leaf',
    });
    expect(r).toEqual({ displayName: 'Ammini', email: 'ammini@example.com', password: 'curry-leaf' });
  });
  it('rejects short passwords with an i18n key', () => {
    const r = signUpSchema.safeParse({ displayName: 'A', email: 'a@b.co', password: 'short' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('auth.errors.passwordShort');
  });
});
