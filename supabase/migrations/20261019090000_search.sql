-- M3 discovery: Manglish-aware recipe search, featured recipes and category counts.
--
-- Search text lives in private.recipe_search, not on recipes: updating a published recipe re-runs its
-- publish check (recipes_before_write), so keeping the text on the row would make an ingredient
-- autosave fail whenever a published recipe briefly had no ingredients.

-- ── Manglish key ─────────────────────────────────────────────────────────────
-- Mirrors manglishKey() in packages/core/src/manglish.ts exactly; parity cases live in
-- supabase/tests/database/30_search.test.sql. Change both together.
create function private.manglish_key(input text)
returns text
language plpgsql
stable -- unaccent() is stable, so this is too; nothing indexes on it
parallel safe
set search_path = ''
as $$
declare
  s text;
begin
  if input is null then
    return '';
  end if;
  s := lower(normalize(input, NFC));
  s := extensions.unaccent('extensions.unaccent'::regdictionary, s);
  s := replace(replace(s, U&'\200C', ''), U&'\200D', ''); -- Malayalam ZWNJ / ZWJ
  s := regexp_replace(s, '[^a-z0-9ഀ-ൿ ]+', ' ', 'g');
  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  s := replace(s, 'zh', 'l');
  s := regexp_replace(s, '([kgcjtdpb])h', '\1', 'g');
  s := replace(s, 'sh', 's');
  s := replace(s, 'ph', 'f');
  s := replace(s, 'w', 'v');
  s := replace(s, 'q', 'k');
  s := regexp_replace(s, 'ee|ii', 'i', 'g');
  s := regexp_replace(s, 'oo|uu', 'u', 'g');
  s := replace(s, 'aa', 'a');
  s := replace(s, 'g', 'k');
  s := replace(s, 'd', 't');
  s := replace(s, 'b', 'p');
  s := regexp_replace(s, '([a-z])\1+', '\1', 'g');
  return s;
end;
$$;

-- ── dictionary ───────────────────────────────────────────────────────────────
alter table public.ingredients add column search_key text not null default '';

create function private.ingredients_search_key()
returns trigger
language plpgsql
security definer -- runs as owner: users can't call private functions
set search_path = ''
as $$
begin
  new.search_key := private.manglish_key(concat_ws(' ', new.name_en, new.name_ml, array_to_string(new.aliases, ' ')));
  return new;
end;
$$;
create trigger ingredients_search_key before insert or update of name_en, name_ml, aliases on public.ingredients
  for each row execute function private.ingredients_search_key();

update public.ingredients
set search_key = private.manglish_key(concat_ws(' ', name_en, name_ml, array_to_string(aliases, ' ')));
create index ingredients_search_key on public.ingredients using gin (search_key extensions.gin_trgm_ops);

-- ── recipe search text ───────────────────────────────────────────────────────
create table private.recipe_search (
  recipe_id uuid primary key references public.recipes on delete cascade,
  title_key text not null,  -- both titles, for ranking title hits first
  doc       text not null   -- titles, description, ingredient lines and dictionary names, tag slugs
);
create index recipe_search_title on private.recipe_search using gin (title_key extensions.gin_trgm_ops);
create index recipe_search_doc on private.recipe_search using gin (doc extensions.gin_trgm_ops);
-- Every word that appears in some recipe: typo correction looks up close spellings here (a few
-- thousand short words) instead of fuzzy-matching every recipe. Words are never removed; a stale
-- word only ever leads to zero matches.
create table private.search_vocab (word text primary key);
create index search_vocab_trgm on private.search_vocab using gin (word extensions.gin_trgm_ops);
revoke all on private.recipe_search, private.search_vocab from public, anon, authenticated;

create function private.refresh_recipe_search(ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.recipe_search (recipe_id, title_key, doc)
  select
    r.id,
    private.manglish_key(concat_ws(' ', r.title_ml, r.title_en)),
    private.manglish_key(concat_ws(' ', r.title_ml, r.title_en, r.description, ing.txt, tg.txt))
  from public.recipes r
  left join lateral (
    select string_agg(concat_ws(' ', ri.item_text, i.name_en, i.name_ml, array_to_string(i.aliases, ' ')), ' ') as txt
    from public.recipe_ingredients ri
    left join public.ingredients i on i.id = ri.ingredient_id
    where ri.recipe_id = r.id
  ) ing on true
  left join lateral (
    select string_agg(t.slug, ' ') as txt
    from public.recipe_tags rt
    join public.tags t on t.id = rt.tag_id
    where rt.recipe_id = r.id
  ) tg on true
  where r.id = any (ids)
  on conflict (recipe_id) do update set title_key = excluded.title_key, doc = excluded.doc;

  insert into private.search_vocab (word)
  select distinct w
  from private.recipe_search s, unnest(string_to_array(s.doc, ' ')) w
  where s.recipe_id = any (ids) and char_length(w) >= 3
  on conflict do nothing;
$$;
revoke execute on function private.refresh_recipe_search(uuid[]) from public, anon, authenticated;

create function private.recipes_search_row()
returns trigger
language plpgsql
security definer -- runs as owner: users can't call private functions
set search_path = ''
as $$
begin
  perform private.refresh_recipe_search(array[new.id]);
  return null;
end;
$$;
create trigger recipes_search after insert or update of title_ml, title_en, description on public.recipes
  for each row execute function private.recipes_search_row();

-- Ingredient and tag changes arrive in batches (the autosave rewrites the whole list), so these run
-- once per statement over the transition tables.
create function private.recipe_children_search()
returns trigger
language plpgsql
security definer -- runs as owner: users can't call private functions
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_recipe_search(array(select distinct recipe_id from old_rows));
  else
    perform private.refresh_recipe_search(array(select distinct recipe_id from new_rows));
  end if;
  return null;
end;
$$;
create trigger recipe_ingredients_search_ins after insert on public.recipe_ingredients
  referencing new table as new_rows for each statement execute function private.recipe_children_search();
create trigger recipe_ingredients_search_upd after update on public.recipe_ingredients
  referencing new table as new_rows for each statement execute function private.recipe_children_search();
create trigger recipe_ingredients_search_del after delete on public.recipe_ingredients
  referencing old table as old_rows for each statement execute function private.recipe_children_search();
create trigger recipe_tags_search_ins after insert on public.recipe_tags
  referencing new table as new_rows for each statement execute function private.recipe_children_search();
create trigger recipe_tags_search_del after delete on public.recipe_tags
  referencing old table as old_rows for each statement execute function private.recipe_children_search();

-- An admin renaming a dictionary entry (or adding an alias) re-indexes the recipes that use it.
create function private.ingredients_changed_search()
returns trigger
language plpgsql
security definer -- runs as owner: users can't call private functions
set search_path = ''
as $$
begin
  perform private.refresh_recipe_search(array(
    select distinct ri.recipe_id from public.recipe_ingredients ri where ri.ingredient_id in (select id from new_rows)
  ));
  return null;
end;
$$;
create trigger ingredients_search_refresh after update on public.ingredients
  referencing new table as new_rows for each statement execute function private.ingredients_changed_search();

select private.refresh_recipe_search(array(select id from public.recipes));

-- ── featured ─────────────────────────────────────────────────────────────────
-- Set by admins (the M6 admin panel; until then by SQL). Not granted to users.
alter table public.recipes add column featured_at timestamptz;
create index recipes_featured on public.recipes (featured_at desc)
  where featured_at is not null and status = 'published' and mod_state = 'visible';

-- ── search ───────────────────────────────────────────────────────────────────
-- One call for search, category pages and the kitchen picker. Returns recipes so PostgREST can embed
-- the card's author and ingredients; page with limit/offset (.range()). Only published, visible
-- recipes are ever returned, so it may read the private search table as its owner.
--   q            free text in Malayalam, English or Manglish. Every word must match: the start of a
--                word in the title (strongest), a dictionary ingredient the recipe uses (jeeragam /
--                jeerakam / ജീരകം / cumin all name cumin), or the start of a word anywhere in the
--                recipe. Words of 5+ letters also match close spellings from private.search_vocab
--                (pg_trgm similarity ≥ 0.5, best five), scored by how close they are.
--   category, region, tag   slugs
--   diet         'veg' includes vegan recipes; the others match exactly
--   max_minutes  total time
--   with_groups  [[ingredient ids], ...]: a recipe must use something from at least one group and
--                ranks higher the more groups it covers (kitchen picker: "coconut" = all coconut forms)
create function public.search_recipes(
  q text default null,
  category text default null,
  diet public.diet default null,
  max_minutes int default null,
  region text default null,
  tag text default null,
  with_groups jsonb default null
)
returns setof public.recipes
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  -- Dynamic SQL so each call is planned with the real values ($1 … $7, never spliced into the text):
  -- a SQL-language body is planned with placeholders, and that generic plan skipped the trigram
  -- indexes and ran about 40× slower (scripts/search-bench.sql: 450 ms → 12 ms on 1,200 recipes).
  return query execute $sql$
    with words as materialized (
        select distinct w
        from unnest(string_to_array(nullif(private.manglish_key($1), ''), ' ')) w
        where char_length(w) >= 2
      ),
      terms as materialized ( -- each query word, plus close spellings of 5+ letter words from the vocabulary
        select w, w as term, 1.0 as fac from words
        union all
        select w, term, fac from (
          select wd.w, v.word as term, extensions.similarity(wd.w, v.word) as fac,
            row_number() over (partition by wd.w order by extensions.similarity(wd.w, v.word) desc) as rank
          from words wd
          join private.search_vocab v on char_length(wd.w) >= 5 and v.word operator(extensions.%) wd.w
          where v.word <> wd.w
        ) near
        where fac >= 0.5 and rank <= 5
      ),
      dict as materialized ( -- (query word, dictionary ingredient it names, strength)
        select t.w, i.id, max(t.fac) as sim
        from terms t join public.ingredients i on i.search_key ~ ('(^| )' || t.term)
        group by t.w, i.id
      ),
      matches as ( -- (recipe, query word, score): every way a word can match a recipe
        select s.recipe_id, t.w, 3.0 * t.fac as sc
        from terms t join private.recipe_search s on s.title_key ~ ('(^| )' || t.term)
        union all
        select ri.recipe_id, d.w, 2 * d.sim
        from dict d join public.recipe_ingredients ri on ri.ingredient_id = d.id
        union all
        select s.recipe_id, t.w, t.fac
        from terms t join private.recipe_search s on s.doc ~ ('(^| )' || t.term)
      ),
      text_hits as ( -- recipes matching every query word, with a relevance score
        select recipe_id, sum(best) as score
        from (select recipe_id, w, max(sc) as best from matches group by recipe_id, w) per_word
        group by recipe_id
        having count(*) = (select count(*) from words)
      ),
      groups as (
        select ord, array(select jsonb_array_elements_text(g.value)::int) as ids
        from jsonb_array_elements(coalesce($7, '[]'::jsonb)) with ordinality g(value, ord)
        where jsonb_typeof(g.value) = 'array'
      ),
      group_hits as ( -- kitchen picker: how many picked groups each recipe uses
        select ri.recipe_id, count(distinct gr.ord) as n
        from groups gr join public.recipe_ingredients ri on ri.ingredient_id = any (gr.ids)
        group by ri.recipe_id
      )
      select r.*
      from public.recipes r
      left join text_hits th on th.recipe_id = r.id
      left join group_hits gh on gh.recipe_id = r.id
      where r.status = 'published'
        and r.mod_state = 'visible'
        and (not exists (select 1 from words) or th.recipe_id is not null)
        and (not exists (select 1 from groups) or gh.recipe_id is not null)
        and ($2 is null
             or r.category_id = (select c.id from public.categories c where c.slug = $2))
        and ($3 is null or r.diet = $3 or ($3 = 'veg' and r.diet = 'vegan')) -- vegan food is veg too
        and ($4 is null
             or (r.total_minutes > 0 and r.total_minutes <= $4))
        and ($5 is null
             or r.region_id = (select x.id from public.regions x where x.slug = $5))
        and ($6 is null or exists (
              select 1 from public.recipe_tags rt join public.tags t on t.id = rt.tag_id
              where rt.recipe_id = r.id and t.slug = $6))
      order by gh.n desc nulls last, th.score desc nulls last, r.featured_at desc nulls last, r.published_at desc
  $sql$ using q, category, diet, max_minutes, region, tag, with_groups;
end;
$fn$;

-- Category grid on Home: published recipes per category.
create function public.category_counts()
returns table (category_id smallint, recipes bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.category_id, count(*)
  from public.recipes r
  where r.status = 'published' and r.mod_state = 'visible' and r.category_id is not null
  group by r.category_id;
$$;

revoke execute on function public.search_recipes(text, text, public.diet, int, text, text, jsonb),
  public.category_counts() from public;
grant execute on function public.search_recipes(text, text, public.diet, int, text, text, jsonb),
  public.category_counts() to anon, authenticated;
