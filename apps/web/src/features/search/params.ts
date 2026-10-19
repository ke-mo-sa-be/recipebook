import type { Diet, DictionaryItem } from '../recipes/api.ts';
import { KITCHEN_GROUPS, KITCHEN_ITEMS, type KitchenItem } from '../home/kitchen.ts';

/** Search state lives in the URL (?q=&cat=&diet=&time=&region=&tag=&with=), so Back and shared links work. */
export type SearchState = {
  q: string;
  cat: string | null;
  diet: Diet | null;
  time: number | null;
  region: string | null;
  tag: string | null;
  with: KitchenItem[];
};

export const TIME_LIMITS = [15, 30, 60] as const;
/** Food-type filters. "Veg" includes vegan recipes (search_recipes). */
export const DIETS: Diet[] = ['veg', 'vegan', 'egg', 'nonveg'];
/** Occasion filters (tags.slug); the order shown in the Filters sheet. */
export const TAGS = [
  'onam',
  'vishu',
  'christmas',
  'ramadan',
  'easter',
  'monsoon',
  'tea-time',
  'kids',
] as const;
export const EMPTY_SEARCH: SearchState = {
  q: '',
  cat: null,
  diet: null,
  time: null,
  region: null,
  tag: null,
  with: [],
};

const slug = (v: string | null) => (v && /^[a-z0-9-]{1,40}$/.test(v) ? v : null);

export function readSearch(params: URLSearchParams): SearchState {
  const diet = params.get('diet');
  const time = Number(params.get('time'));
  return {
    q: (params.get('q') ?? '').trim().slice(0, 100),
    cat: slug(params.get('cat')),
    diet: (DIETS as string[]).includes(diet ?? '') ? (diet as Diet) : null,
    time: (TIME_LIMITS as readonly number[]).includes(time) ? time : null,
    region: slug(params.get('region')),
    tag: slug(params.get('tag')),
    with: (params.get('with') ?? '')
      .split(',')
      .filter(
        (i, n, all): i is KitchenItem =>
          (KITCHEN_ITEMS as readonly string[]).includes(i) && all.indexOf(i) === n,
      ),
  };
}

export function writeSearch(s: SearchState): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.cat) p.set('cat', s.cat);
  if (s.diet) p.set('diet', s.diet);
  if (s.time) p.set('time', String(s.time));
  if (s.region) p.set('region', s.region);
  if (s.tag) p.set('tag', s.tag);
  if (s.with.length) p.set('with', s.with.join(','));
  return p.toString();
}

/** How many filters (not the text) are on: for the Filters button badge. */
export function filterCount(s: SearchState): number {
  return [s.cat, s.diet, s.time, s.region, s.tag].filter(Boolean).length + s.with.length;
}

export type SearchArgs = {
  q?: string;
  category?: string;
  diet?: Diet;
  max_minutes?: number;
  region?: string;
  tag?: string;
  with_groups?: number[][];
};

/** The search_recipes RPC arguments; kitchen items become groups of dictionary ingredient ids. */
export function toSearchArgs(s: SearchState, dictionary: DictionaryItem[] = []): SearchArgs {
  const idBySlug = new Map(dictionary.map((d) => [d.slug, d.id]));
  const groups = s.with
    .map((item) =>
      KITCHEN_GROUPS[item].map((sl) => idBySlug.get(sl)).filter((id): id is number => id != null),
    )
    .filter((g) => g.length > 0);
  const args: SearchArgs = {};
  if (s.q) args.q = s.q;
  if (s.cat) args.category = s.cat;
  if (s.diet) args.diet = s.diet;
  if (s.time) args.max_minutes = s.time;
  if (s.region) args.region = s.region;
  if (s.tag) args.tag = s.tag;
  if (groups.length) args.with_groups = groups;
  return args;
}
