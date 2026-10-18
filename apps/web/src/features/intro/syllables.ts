/**
 * പാചകം sounds the same in every Brahmic script, so the welcome animation rolls each syllable
 * (paa · cha · kam) through other Indian scripts and locks it into Malayalam. Spellings need a
 * native speaker's check before v1. `family` must match a font fetched by scripts/intro-fonts.ts;
 * run `pnpm intro:fonts` after editing.
 */
export type ScriptRow = { lang: string; family: string; syllables: [string, string, string] };

/** Rolled past in this order; Malayalam (the app's own font) is always the final row. */
export const REEL_SCRIPTS: ScriptRow[] = [
  { lang: 'ta', family: 'Noto Sans Tamil', syllables: ['பா', 'ச', 'கம்'] },
  { lang: 'te', family: 'Noto Sans Telugu', syllables: ['పా', 'చ', 'కం'] },
  { lang: 'kn', family: 'Noto Sans Kannada', syllables: ['ಪಾ', 'ಚ', 'ಕಂ'] },
  { lang: 'hi', family: 'Noto Sans Devanagari', syllables: ['पा', 'च', 'कम्'] },
  { lang: 'bn', family: 'Noto Sans Bengali', syllables: ['পা', 'চ', 'কম্'] },
  { lang: 'gu', family: 'Noto Sans Gujarati', syllables: ['પા', 'ચ', 'કમ્'] },
  { lang: 'or', family: 'Noto Sans Oriya', syllables: ['ପା', 'ଚ', 'କମ୍'] },
  { lang: 'pa', family: 'Noto Sans Gurmukhi', syllables: ['ਪਾ', 'ਚ', 'ਕਮ'] },
];

export const MALAYALAM: [string, string, string] = ['പാ', 'ച', 'കം'];

/** The CSS family name for a fetched subset (prefixed so a locally installed Noto never stands in). */
export const introFamily = (family: string) => `PK Intro ${family.replace('Noto Sans ', '')}`;
