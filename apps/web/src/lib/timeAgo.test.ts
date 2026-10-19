import { describe, expect, it } from 'vitest';
import { timeAgo } from './timeAgo.ts';

describe('timeAgo', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');
  it('picks the largest whole unit', () => {
    expect(timeAgo('2026-10-20T10:00:00Z', 'en', now)).toBe('2 hours ago');
    expect(timeAgo('2026-10-19T12:00:00Z', 'en', now)).toBe('yesterday');
    expect(timeAgo('2026-10-20T11:59:40Z', 'en', now)).toBe('now');
  });
  it('speaks Malayalam', () => {
    expect(timeAgo('2026-10-20T10:00:00Z', 'ml', now)).toMatch(/മണിക്കൂർ/);
  });
});
