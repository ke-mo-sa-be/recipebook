/** Starter ingredients for the "What's in your kitchen?" picker. Slug = sticker file and i18n key. */
export const KITCHEN_ITEMS = [
  'coconut',
  'onion',
  'herb',
  'hot-pepper',
  'tomato',
  'fish',
  'garlic',
  'ginger-root',
] as const;
export type KitchenItem = (typeof KITCHEN_ITEMS)[number];
