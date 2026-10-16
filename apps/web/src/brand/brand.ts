/**
 * The ONLY place the product's name, tagline and logo are defined.
 * The final name is undecided — change it here (and the icons in public/) and nowhere else.
 */
export const brand = {
  name: { ml: 'പാചകപ്പുസ്തകം', en: 'Recipebook' },
  tagline: {
    ml: 'വീട്ടിലെ രുചികൾ, എല്ലാവർക്കുമായി',
    en: 'Home recipes, shared by everyone',
  },
  logo: '/favicon.svg',
  themeColor: { light: '#FFF7EA', dark: '#17110C' },
} as const;
