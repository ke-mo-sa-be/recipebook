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

/**
 * What each picker sticker means in the dictionary: "coconut" covers every coconut form a recipe might
 * list. A recipe matches a picked item if it uses any of these (search_recipes with_groups).
 */
export const KITCHEN_GROUPS: Record<KitchenItem, string[]> = {
  coconut: ['coconut', 'grated-coconut', 'coconut-milk', 'thick-coconut-milk', 'thin-coconut-milk'],
  onion: ['shallots', 'onion'],
  herb: ['curry-leaves'],
  'hot-pepper': ['green-chilli', 'dried-red-chilli', 'chilli-powder', 'kashmiri-chilli-powder'],
  tomato: ['tomato'],
  fish: ['fish', 'sardine', 'mackerel', 'seer-fish', 'pearl-spot', 'anchovy', 'dried-fish'],
  garlic: ['garlic', 'ginger-garlic-paste'],
  'ginger-root': ['ginger', 'ginger-garlic-paste'],
};
