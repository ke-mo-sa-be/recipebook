import { describe, expect, it } from 'vitest';
import { APP_VERSION, RELEASES } from './releases.ts';

describe("What's new", () => {
  it('has notes for the current app version, newest first', () => {
    expect(RELEASES[0]?.version).toBe(APP_VERSION);
  });
  it('has the same number of notes in both languages', () => {
    for (const r of RELEASES) expect(r.notes.ml).toHaveLength(r.notes.en.length);
  });
});
