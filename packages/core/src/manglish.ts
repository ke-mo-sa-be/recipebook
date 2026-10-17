// Matching for ingredient names typed in Malayalam, English or Manglish (Malayalam in Latin
// letters, spelled many ways: jeerakam / jeeragam / jeeraka). Both sides are reduced to a loose
// "sound key" before comparing. The SQL search (M3) mirrors normalizeName() exactly.

/** Lower-case, strip accents and joiners, keep letters (Latin + Malayalam) and digits. */
export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .replace(/[‌‍]/g, '') // Malayalam ZWNJ / ZWJ
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-z0-9ഀ-ൿ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Loose sound key for Latin spellings; Malayalam script passes through unchanged. */
export function manglishKey(input: string): string {
  let s = normalizeName(input);
  s = s
    .replace(/zh/g, 'l') // vazhakka / valakka
    .replace(/([kgcjtdpb])h/g, '$1') // aspirates: thakkali / takkali
    .replace(/sh/g, 's')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/q/g, 'k')
    .replace(/ee|ii/g, 'i')
    .replace(/oo|uu/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/g/g, 'k') // voicing varies: jeeragam / jeerakam
    .replace(/d/g, 't')
    .replace(/b/g, 'p')
    .replace(/([a-z])\1+/g, '$1'); // doubled letters: thakkali / thakali
  return s;
}

export type Nameable = { name_en: string; name_ml: string; aliases?: readonly string[] };

function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]!);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

/** 0 = no match; higher is better. */
export function scoreName(query: string, item: Nameable): number {
  const q = manglishKey(query);
  if (!q) return 0;
  const names = [item.name_en, item.name_ml, ...(item.aliases ?? [])].map(manglishKey).filter(Boolean);
  let best = 0;
  for (const n of names) {
    if (n === q) best = Math.max(best, 100);
    else if (n.startsWith(q)) best = Math.max(best, 85 - Math.min(10, n.length - q.length));
    else if (n.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 70);
    else if (q.length >= 3 && n.includes(q)) best = Math.max(best, 60);
    else if (q.length >= 4) {
      const max = q.length >= 7 ? 2 : 1;
      const d = levenshtein(q, n.slice(0, q.length + max), max);
      if (d <= max) best = Math.max(best, 45 - d * 5);
    }
  }
  return best;
}

/** Best matches first. Used by the wizard's ingredient picker (the dictionary is small, ~150 items). */
export function searchByName<T extends Nameable>(query: string, items: readonly T[], limit = 8): T[] {
  return items
    .map((item) => ({ item, score: scoreName(query, item) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}
