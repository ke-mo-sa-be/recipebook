/**
 * The ONLY place the product's name, tagline and logo are defined (name decided 2026-10-17).
 * To rebrand, change it here, the icon art in brand/icon-art.svg (then `pnpm icons`) and
 * public/manifest.webmanifest.
 */
export const brand = {
  name: { ml: 'പാചകം', en: 'Paachakam' },
  tagline: {
    ml: 'വീട്ടിലെ രുചികൾ, എല്ലാവർക്കുമായി',
    en: 'Home recipes, shared by everyone',
  },
  logo: '/favicon.svg',
  themeColor: { light: '#F2F1EF', dark: '#0F0F0E' },
} as const;
