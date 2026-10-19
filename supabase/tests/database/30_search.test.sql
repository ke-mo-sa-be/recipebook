begin;
\ir _helpers.inc
select plan(35);

-- ── Manglish key: the SQL mirrors packages/core manglishKey() exactly ──
-- Expected values are manglishKey()'s output for the same inputs.
select is(private.manglish_key('Jeéra—Powder'), 'jira povter', 'key: accents and punctuation');
select is(private.manglish_key('jeeragam'), 'jirakam', 'key: jeeragam');
select is(private.manglish_key('jeerakam'), 'jirakam', 'key: jeerakam folds to the same');
select is(private.manglish_key('thakkali'), 'takali', 'key: aspirates and doubles');
select is(private.manglish_key('vazhakka'), 'valaka', 'key: zh');
select is(private.manglish_key('Kudampuli'), 'kutampuli', 'key: d → t');
select is(private.manglish_key('ജീരകം'), 'ജീരകം', 'key: Malayalam passes through');
select is(private.manglish_key(E'ഉള്ളി‍വട'), 'ഉള്ളിവട', 'key: Malayalam joiners dropped');
select is(private.manglish_key('Shallots, small onion'), 'salots smal onion', 'key: sh, doubles');
select is(private.manglish_key('Phulka'), 'pulka', 'key: ph');
select is(private.manglish_key('Biriyaani'), 'piriyani', 'key: aa, b → p');
select is(private.manglish_key('meen curry'), 'min cury', 'key: ee, rr');

-- ── fixture: a cook with three published recipes and a draft ──
select tests.create_user('searchcook@example.com', '{"display_name":"Search Cook"}') as cook \gset
select gen_random_uuid() as jeera \gset
select gen_random_uuid() as molee \gset
select gen_random_uuid() as both_r \gset
select gen_random_uuid() as draft \gset
select id as cumin from public.ingredients where slug = 'cumin' \gset
select id as kudampuli from public.ingredients where slug = 'kudampuli' \gset
select id as seer from public.ingredients where slug = 'seer-fish' \gset
select id as tomato from public.ingredients where slug = 'tomato' \gset

select tests.act_as(:'cook');
insert into public.recipes (id, author_id, title_en, title_ml, content_lang, category_id, diet, servings, prep_minutes, cook_minutes)
values
  (:'jeera', auth.uid(), 'Zqx Jeera Rice', null, 'en', 3, 'veg', 2, 5, 10),
  (:'molee', auth.uid(), 'Zqx Fish Molee', 'സ്ക്യൂ മീൻ മോളി', 'ml', 5, 'nonveg', 4, 15, 30),
  (:'both_r', auth.uid(), 'Zqx Spiced Fish', null, 'en', 5, 'nonveg', 4, 10, 20),
  (:'draft', auth.uid(), 'Zqx Secret Jeera', null, 'en', 3, 'veg', 2, 5, 5);
select public.save_recipe_items(:'jeera', jsonb_build_array(jsonb_build_object('item_text', 'Cumin', 'ingredient_id', :cumin, 'unit_code', 'tsp', 'amount', 1)), '[{"body":"Cook."}]');
select public.save_recipe_items(:'molee', jsonb_build_array(
  jsonb_build_object('item_text', 'Kudampuli', 'ingredient_id', :kudampuli),
  jsonb_build_object('item_text', 'Seer fish', 'ingredient_id', :seer, 'unit_code', 'kg', 'amount', 0.5)), '[{"body":"Simmer."}]');
select public.save_recipe_items(:'both_r', jsonb_build_array(
  jsonb_build_object('item_text', 'Cumin', 'ingredient_id', :cumin),
  jsonb_build_object('item_text', 'Seer fish', 'ingredient_id', :seer)), '[{"body":"Fry."}]');
select public.save_recipe_items(:'draft', jsonb_build_array(jsonb_build_object('item_text', 'Cumin', 'ingredient_id', :cumin)), '[{"body":"Shh."}]');
update public.recipes set status = 'published' where id in (:'jeera', :'molee', :'both_r');
insert into public.recipe_tags (recipe_id, tag_id) select :'molee', id from public.tags where slug = 'monsoon';

-- ── search as a signed-out visitor ──
select tests.act_as(null);
create temp table hits as select null::text as q, null::uuid as id limit 0;
grant all on hits to anon, authenticated;
insert into hits select q, r.id from unnest(array['jeerakam', 'jeeragam', 'ജീരകം', 'cumin', 'kudampuli', 'meen', 'മീൻ മോളി', 'zqx molee', 'kudampuly']) q,
  lateral public.search_recipes(q => q) r;

select ok(exists (select 1 from hits where q = 'jeerakam' and id = :'jeera'), 'jeerakam finds the cumin recipe');
select ok(exists (select 1 from hits where q = 'jeeragam' and id = :'jeera'), 'jeeragam finds it');
select ok(exists (select 1 from hits where q = 'ജീരകം' and id = :'jeera'), 'ജീരകം finds it');
select ok(exists (select 1 from hits where q = 'cumin' and id = :'jeera'), 'cumin finds it');
select ok(not exists (select 1 from hits where id = :'draft'), 'drafts never appear in search');
select ok(exists (select 1 from hits where q = 'kudampuli' and id = :'molee'), 'kudampuli finds the fish molee');
select ok(not exists (select 1 from hits where q = 'kudampuli' and id = :'jeera'), 'kudampuli does not find unrelated recipes');
select ok(exists (select 1 from hits where q = 'meen' and id = :'molee'), 'meen finds a recipe using seer fish');
select ok(exists (select 1 from hits where q = 'മീൻ മോളി' and id = :'molee'), 'Malayalam title words find it');
select ok(exists (select 1 from hits where q = 'kudampuly' and id = :'molee'), 'a typo in a long word still finds it');
select is((select count(*)::int from hits where q = 'zqx molee'), 1, 'every word must match: one recipe for "zqx molee"');

-- filters combine
select set_eq(format($$ select id from public.search_recipes(q => 'zqx', diet => 'veg', max_minutes => 20) $$),
  format($$ values (%L::uuid) $$, :'jeera'), 'diet + time filters combine');
select tests.act_as(:'cook');
update public.recipes set diet = 'vegan' where id = :'jeera';
select tests.act_as(null);
select ok(exists (select 1 from public.search_recipes(q => 'zqx', diet => 'veg') where id = :'jeera'), 'the veg filter includes vegan recipes');
select tests.act_as(:'cook');
update public.recipes set diet = 'veg' where id = :'jeera';
select tests.act_as(null);
select set_eq(format($$ select id from public.search_recipes(q => 'zqx', category => 'seafood') $$),
  format($$ values (%L::uuid), (%L::uuid) $$, :'molee', :'both_r'), 'category filter by slug');
select set_eq(format($$ select id from public.search_recipes(q => 'zqx', tag => 'monsoon') $$),
  format($$ values (%L::uuid) $$, :'molee'), 'tag filter');

-- kitchen picker groups: a recipe needs one group and ranks higher with more
select is((select id from public.search_recipes(q => 'zqx', with_groups => jsonb_build_array(jsonb_build_array(:cumin), jsonb_build_array(:seer))) limit 1),
  :'both_r'::uuid, 'the recipe using both picked ingredients ranks first');
select ok(not exists (select 1 from public.search_recipes(q => 'zqx', with_groups => jsonb_build_array(jsonb_build_array(:tomato)))),
  'recipes without any picked ingredient are left out');

-- ── the search text follows edits ──
select tests.act_as(:'cook');
select public.save_recipe_items(:'jeera', jsonb_build_array(jsonb_build_object('item_text', 'Tomato', 'ingredient_id', :tomato)), '[{"body":"Cook."}]');
update public.recipes set title_en = 'Zqx Tomato Rice' where id = :'jeera';
select tests.act_as(null);
select ok(not exists (select 1 from public.search_recipes(q => 'jeerakam') where id = :'jeera'), 'removed ingredients stop matching');
select ok(exists (select 1 from public.search_recipes(q => 'thakkali') where id = :'jeera'), 'new ingredients match (thakkali → tomato)');
select ok(exists (select 1 from public.search_recipes(q => 'zqx tomato rice') where id = :'jeera'), 'renamed titles match');

-- ── privacy and permissions ──
select throws_ok($$ select * from private.recipe_search $$, '42501', null, 'anon cannot read the private search table');
select ok((select recipes from public.category_counts() where category_id = 5) >= 2, 'category counts include published recipes');
select tests.act_as(:'cook');
select throws_ok(format($$ update public.recipes set featured_at = now() where id = %L $$, :'jeera'), '42501', null, 'users cannot feature their own recipe');

select * from finish();
rollback;
