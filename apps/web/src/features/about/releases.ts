import type { Lang } from '@recipebook/core';

/**
 * What's new, written for cooks rather than developers: one short line per change they can notice.
 * The newest release comes first and must match the app version (releases.test.ts checks this), so
 * bumping the version means writing its notes here in both languages.
 */
export type Release = { version: string; date: string; notes: Record<Lang, string[]> };

export const APP_VERSION = __APP_VERSION__;

export const RELEASES: Release[] = [
  {
    version: '0.2.2',
    date: '2026-10-18',
    notes: {
      en: ['A smoother welcome: പാ · ച · കം roll through eight Indian scripts and lock into Malayalam.'],
      ml: ['കൂടുതൽ സുഗമമായ സ്വാഗതം: പാ · ച · കം എട്ട് ഇന്ത്യൻ ലിപികളിലൂടെ കറങ്ങി മലയാളത്തിൽ നിൽക്കുന്നു.'],
    },
  },
  {
    version: '0.2.1',
    date: '2026-10-18',
    notes: {
      en: [
        'A Small text size, for more on the screen (Settings → Text size).',
        'Switch between light and dark with the sun / moon button at the top.',
        'Recipes now say which language they are written in.',
        'Install Paachakam on your home screen, like an app.',
        'A short welcome animation.',
        'This page, so you can see what has changed.',
      ],
      ml: [
        'സ്ക്രീനിൽ കൂടുതൽ കാണാൻ ചെറിയ അക്ഷര വലുപ്പം (സെറ്റിംഗ്സ് → അക്ഷര വലുപ്പം).',
        'മുകളിലെ സൂര്യൻ / ചന്ദ്രൻ ബട്ടൺ കൊണ്ട് ലൈറ്റ്, ഡാർക്ക് നിറങ്ങൾ മാറ്റാം.',
        'റെസിപ്പി ഏതു ഭാഷയിൽ എഴുതിയതാണെന്ന് ഇനി കാണിക്കും.',
        'ഒരു ആപ്പ് പോലെ പാചകം ഹോം സ്ക്രീനിൽ ഇൻസ്റ്റാൾ ചെയ്യാം.',
        'ഒരു ചെറിയ സ്വാഗത ആനിമേഷൻ.',
        'എന്തൊക്കെ മാറി എന്ന് കാണാൻ ഈ പേജ്.',
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2026-10-18',
    notes: {
      en: [
        'Add your own recipes with photos, step by step. Your draft saves itself as you type.',
        'Change the servings and every amount changes with them.',
        'See Kerala measures (glass, pidi, ladle) in millilitres and grams.',
        'Find ingredients in Malayalam, English or Manglish: “jeeragam” finds cumin.',
        'Timers appear by themselves when a step says “10 minutes”.',
        'Sign up with your email and confirm it from your inbox.',
      ],
      ml: [
        'ഫോട്ടോ സഹിതം നിങ്ങളുടെ റെസിപ്പികൾ ഓരോ പടിയായി ചേർക്കാം. ടൈപ്പ് ചെയ്യുമ്പോൾ തന്നെ ഡ്രാഫ്റ്റ് സേവ് ആകും.',
        'എത്ര പേർക്ക് എന്ന് മാറ്റിയാൽ എല്ലാ അളവുകളും അതിനൊപ്പം മാറും.',
        'ഗ്ലാസ്, പിടി, തവി തുടങ്ങിയ അളവുകൾ മില്ലിലിറ്ററിലും ഗ്രാമിലും കാണാം.',
        'ചേരുവകൾ മലയാളത്തിലോ ഇംഗ്ലീഷിലോ മംഗ്ലീഷിലോ തിരയാം: “jeeragam” എന്നു തിരഞ്ഞാൽ ജീരകം കിട്ടും.',
        'ഒരു പടിയിൽ “10 മിനിറ്റ്” എന്നുണ്ടെങ്കിൽ ടൈമർ തനിയെ വരും.',
        'ഇമെയിൽ കൊണ്ട് സൈൻ അപ്പ് ചെയ്ത് ഇൻബോക്സിൽ നിന്ന് ഉറപ്പിക്കാം.',
      ],
    },
  },
];
