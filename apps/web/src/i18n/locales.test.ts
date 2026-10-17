import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from './locales/en/common.json';
import ml from './locales/ml/common.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

const enKeys = flatten(en);
const mlKeys = flatten(ml);
const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx') ? [p] : [];
  });
}

describe('locales', () => {
  it('Malayalam and English have exactly the same keys', () => {
    expect([...mlKeys.keys()].sort()).toEqual([...enKeys.keys()].sort());
  });

  it('every string uses the same {{placeholders}} in both languages', () => {
    for (const [key, value] of enKeys)
      expect(placeholders(mlKeys.get(key) ?? ''), key).toEqual(placeholders(value));
  });

  it('no empty or untranslated (TODO-ml) values', () => {
    for (const [key, value] of [...enKeys, ...mlKeys]) {
      expect(value.trim(), key).not.toBe('');
      expect(value, key).not.toMatch(/^TODO-ml/);
    }
  });

  it('every literal t("…") key used in the source exists', () => {
    const src = join(__dirname, '..');
    const used = new Set<string>();
    for (const file of sourceFiles(src)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]!);
    }
    // Plural keys exist only with i18next suffixes (_zero/_one/_other).
    const missing = [...used].filter((k) => !enKeys.has(k) && !enKeys.has(`${k}_other`));
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(20);
  });
});
