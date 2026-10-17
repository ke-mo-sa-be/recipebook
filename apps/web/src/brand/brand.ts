/**
 * The ONLY place the product's name, tagline and logo are defined (name decided 2026-10-17).
 * To rebrand, change it here (and the icons in public/) and nowhere else.
 */
export const brand = {
  name: { ml: 'പാചകം', en: 'Paachakam' },
  tagline: {
    ml: 'വീട്ടിലെ രുചികൾ, എല്ലാവർക്കുമായി',
    en: 'Home recipes, shared by everyone',
  },
  logo: '/favicon.svg',
  themeColor: { light: '#FFF7EA', dark: '#17110C' },
} as const;
