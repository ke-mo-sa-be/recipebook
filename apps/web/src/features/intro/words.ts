/**
 * The welcome animation flips through the word for "cooking" (or the kitchen) in Indian languages and
 * lands on പാചകം. Spellings need a native speaker's check before v1 (docs/ROADMAP.md, M7 language pass).
 * `family` must match a font fetched by scripts/intro-fonts.ts; run `pnpm intro:fonts` after editing.
 */
export type IntroWord = { lang: string; family: string; word: string; latin: string };

export const INTRO_WORDS: IntroWord[] = [
  { lang: 'ta', family: 'Noto Sans Tamil', word: 'சமையல்', latin: 'samaiyal' },
  { lang: 'te', family: 'Noto Sans Telugu', word: 'వంట', latin: 'vanta' },
  { lang: 'kn', family: 'Noto Sans Kannada', word: 'ಅಡುಗೆ', latin: 'aduge' },
  { lang: 'hi', family: 'Noto Sans Devanagari', word: 'रसोई', latin: 'rasoi' },
  { lang: 'bn', family: 'Noto Sans Bengali', word: 'রান্না', latin: 'ranna' },
  { lang: 'mr', family: 'Noto Sans Devanagari', word: 'स्वयंपाक', latin: 'swayampak' },
  { lang: 'gu', family: 'Noto Sans Gujarati', word: 'રાંધણ', latin: 'raandhan' },
  { lang: 'or', family: 'Noto Sans Oriya', word: 'ରୋଷେଇ', latin: 'roshei' },
];

/** The CSS family name for a fetched subset (prefixed so a locally installed Noto never stands in). */
export const introFamily = (family: string) => `PK Intro ${family.replace('Noto Sans ', '')}`;
