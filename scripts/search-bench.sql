-- Search speed check (M3 AC: p95 under 200 ms on about 1,200 recipes).
-- Clones the seed recipes 100× (≈1,200 published recipes with their ingredients and steps), times
-- typical searches as a signed-out visitor, prints p50 / p95 / max per query, then ROLLS BACK.
-- Needs the dev seed loaded. Usage: pnpm bench:search
\set ON_ERROR_STOP on
\timing off
begin;

create temp table src as
select r.* from public.recipes r where r.status = 'published' and r.author_id in (
  select id from public.profiles where handle in ('ammini', 'sheela_cooks', 'thomas_k', 'rasiya'));

create temp table clones as
select gen_random_uuid() as id, s.id as src_id, n
from src s, generate_series(1, 100) n;

insert into public.recipes (id, author_id, title_ml, title_en, description, content_lang, category_id, region_id,
  diet, prep_minutes, cook_minutes, servings, tips)
select c.id, s.author_id, s.title_ml, concat(s.title_en, ' ', c.n), s.description, s.content_lang, s.category_id,
  s.region_id, s.diet, s.prep_minutes, s.cook_minutes, s.servings, s.tips
from clones c join src s on s.id = c.src_id;

insert into public.recipe_ingredients (recipe_id, position, group_label, amount, amount_max, unit_code, ingredient_id, item_text, note)
select c.id, ri.position, ri.group_label, ri.amount, ri.amount_max, ri.unit_code, ri.ingredient_id, ri.item_text, ri.note
from clones c join public.recipe_ingredients ri on ri.recipe_id = c.src_id;

insert into public.recipe_steps (recipe_id, position, body, timer_seconds)
select c.id, rs.position, rs.body, rs.timer_seconds
from clones c join public.recipe_steps rs on rs.recipe_id = c.src_id;

update public.recipes set status = 'published' where id in (select id from clones);

select count(*) as published_recipes from public.recipes where status = 'published';

create temp table timings (label text, ms numeric);
grant all on timings to anon;
grant select on clones to anon;
set local role anon;

do $$
declare
  t0 timestamptz;
  n int;
  cases jsonb := jsonb_build_array(
    jsonb_build_object('label', 'jeerakam', 'q', 'jeerakam'),
    jsonb_build_object('label', 'meen curry', 'q', 'meen curry'),
    jsonb_build_object('label', 'kudampuli', 'q', 'kudampuli'),
    jsonb_build_object('label', 'ജീരകം', 'q', 'ജീരകം'),
    jsonb_build_object('label', 'typo: kudampuly', 'q', 'kudampuly'),
    jsonb_build_object('label', 'no match', 'q', 'zzqqxx'),
    jsonb_build_object('label', 'browse: seafood, non-veg', 'category', 'seafood', 'diet', 'nonveg'),
    jsonb_build_object('label', 'browse: under 30 min', 'max_minutes', 30)
  );
  c jsonb;
begin
  foreach c in array array(select jsonb_array_elements(cases)) loop
    for i in 1..40 loop
      t0 := clock_timestamp();
      select count(*) into n from public.search_recipes(
        q => c ->> 'q', category => c ->> 'category', diet => (c ->> 'diet')::public.diet,
        max_minutes => (c ->> 'max_minutes')::int);
      insert into timings values (c ->> 'label', extract(epoch from clock_timestamp() - t0) * 1000);
    end loop;
  end loop;
  -- kitchen picker: coconut forms, shallots/onion, curry leaves
  for i in 1..40 loop
    t0 := clock_timestamp();
    select count(*) into n from public.search_recipes(with_groups => (
      select jsonb_agg(g) from (
        select jsonb_agg(id) as g from public.ingredients where slug in ('coconut', 'grated-coconut', 'coconut-milk')
        union all select jsonb_agg(id) from public.ingredients where slug in ('shallots', 'onion')
        union all select jsonb_agg(id) from public.ingredients where slug = 'curry-leaves') x));
    insert into timings values ('kitchen: 3 groups', extract(epoch from clock_timestamp() - t0) * 1000);
  end loop;
end $$;

select label,
  round(percentile_cont(0.5) within group (order by ms)::numeric, 1) as p50_ms,
  round(percentile_cont(0.95) within group (order by ms)::numeric, 1) as p95_ms,
  round(max(ms), 1) as max_ms
from timings group by label order by p95_ms desc;

rollback;
