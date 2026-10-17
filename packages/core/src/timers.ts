// Finds a cooking time in a step's text so the wizard can suggest a timer ("simmer for 10 minutes",
// "10 മിനിറ്റ്", "അര മണിക്കൂർ"). Returns seconds, or null. For ranges ("8–10 min") the upper bound is
// used: the cook can always stop early.

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  'forty-five': 45,
  sixty: 60,
  half: 0.5,
  ഒരു: 1,
  ഒന്ന്: 1,
  രണ്ട്: 2,
  മൂന്ന്: 3,
  നാല്: 4,
  അഞ്ച്: 5,
  പത്ത്: 10,
  പതിനഞ്ച്: 15,
  ഇരുപത്: 20,
  മുപ്പത്: 30,
  അര: 0.5,
};

const UNIT_SECONDS: Array<[RegExp, number]> = [
  [/^(h|hr|hrs|hour|hours|മണിക്കൂർ|മണിക്കൂറ്)/, 3600],
  [/^(m|min|mins|minute|minutes|മിനിറ്റ്|മിനിട്ട്|മിനുട്ട്)/, 60],
  [/^(s|sec|secs|second|seconds|സെക്കൻഡ്)/, 1],
];

const NUM = String.raw`(\d+(?:[.,]\d+)?|[a-z-]+|[ഀ-ൿ]+)`;
const PATTERN = new RegExp(
  String.raw`${NUM}(?:\s*(?:-|–|to|or|മുതൽ)\s*${NUM})?\s*(hours?|hrs?|h\b|minutes?|mins?|min\b|seconds?|secs?|[ഀ-ൿ]+)`,
  'giu',
);

function toNumber(token: string | undefined): number | null {
  if (!token) return null;
  const t = token.toLowerCase().replace(',', '.');
  if (/^\d/.test(t)) return Number.parseFloat(t);
  return WORD_NUMBERS[t] ?? null;
}

export function detectTimerSeconds(text: string): number | null {
  // "half an hour" would otherwise match as "an hour".
  const normalized = text.replace(/\bhalf an? (hour|hr)\b/gi, '0.5 hour');
  for (const m of normalized.matchAll(PATTERN)) {
    const unit = UNIT_SECONDS.find(([re]) => re.test(m[3]!.toLowerCase()));
    if (!unit) continue;
    const a = toNumber(m[1]);
    const b = toNumber(m[2]);
    const n = b ?? a;
    if (n == null || n <= 0) continue;
    // "അര മണിക്കൂർ" (half an hour): the half word is caught as the number.
    const seconds = Math.round(n * unit[1]);
    if (seconds >= 10 && seconds <= 24 * 3600) return seconds;
  }
  return null;
}

/** "10 min", "1 h 30 min", "45 s". */
export function formatDuration(seconds: number): { h: number; m: number; s: number } {
  return { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60), s: seconds % 60 };
}
