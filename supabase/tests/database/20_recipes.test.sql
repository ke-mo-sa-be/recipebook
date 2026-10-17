begin;
\ir _helpers.inc
select plan(37);

select tests.create_user('cook@example.com', '{"display_name":"Cook"}') as cook \gset
select tests.create_user('other@example.com', '{"display_name":"Other"}') as other \gset
select tests.create_user('mod@example.com', '{"display_name":"Mod"}') as modr \gset
select tests.create_user('admin@example.com', '{"display_name":"Admin"}') as adm \gset
update public.profiles set role = 'moderator' where id = :'modr';
update public.profiles set role = 'admin' where id = :'adm';
select gen_random_uuid() as rid \gset

-- ── lookups and dictionary ────────────────────────────
select tests.act_as(null);
select ok((select count(*) from public.categories) > 0, 'anon reads categories');
select ok((select count(*) from public.ingredients) > 100, 'anon reads the dictionary');
select throws_ok($$ insert into public.ingredients (slug, name_en, name_ml, grp) values ('x', 'X', 'എക്സ്', 'other') $$, '42501', null, 'anon cannot add to the dictionary');
select tests.act_as(:'cook');
select throws_ok($$ insert into public.ingredients (slug, name_en, name_ml, grp) values ('x', 'X', 'എക്സ്', 'other') $$, '42501', null, 'a regular user cannot add to the dictionary');
select tests.act_as(:'adm');
select lives_ok($$ insert into public.ingredients (slug, name_en, name_ml, grp) values ('test-item', 'Test', 'ടെസ്റ്റ്', 'other') $$, 'an admin can add to the dictionary');

-- ── creating a draft ──────────────────────────────────
select tests.act_as(:'cook');
select lives_ok(format($$ insert into public.recipes (id, author_id, title_en) values (%L, auth.uid(), 'Fish curry') $$, :'rid'), 'a user creates a draft');
select is((select status::text from public.recipes where id = :'rid'), 'draft', 'new recipes start as drafts');
select is((select slug from public.recipes where id = :'rid'), 'fish-curry', 'slug comes from the English title');
select throws_ok(format($$ insert into public.recipes (author_id, title_en) values (%L, 'Impostor') $$, :'other'), '42501', null, 'cannot create a recipe as someone else');
select throws_ok($$ insert into public.recipes (author_id, title_en, status) values (auth.uid(), 'Sneaky', 'published') $$, '42501', null, 'cannot insert straight into published');
select throws_ok(format($$ update public.recipes set cover_path = 'recipes/x/y/z' where id = %L $$, :'rid'), '42501', null, 'cover_path is set only by the photo pipeline');

-- ── drafts are private ────────────────────────────────
select tests.act_as(null);
select is((select count(*)::int from public.recipes where id = :'rid'), 0, 'anon cannot see a draft');
select tests.act_as(:'other');
select is((select count(*)::int from public.recipes where id = :'rid'), 0, 'another user cannot see a draft');
select tests.act_as(:'modr');
select is((select count(*)::int from public.recipes where id = :'rid'), 1, 'a moderator can see a draft');

-- ── publishing needs the essentials ───────────────────
select tests.act_as(:'cook');
update public.recipes set category_id = 2, diet = 'nonveg', servings = 4 where id = :'rid';
select throws_ok(format($$ update public.recipes set status = 'published' where id = %L $$, :'rid'), 'P0001', 'recipe.errors.ingredientsRequired', 'cannot publish without ingredients');
select lives_ok(format($$ select public.save_recipe_items(%L,
    '[{"item_text":"Fish","amount":0.5,"unit_code":"kg"},{"item_text":"Salt","unit_code":"to_taste"}]',
    '[{"body":"Simmer for 10 minutes.","timer_seconds":600}]') $$, :'rid'), 'the owner autosaves ingredients and steps');
select is((select count(*)::int from public.recipe_ingredients where recipe_id = :'rid'), 2, 'two ingredients saved');
select is((select array_agg(position order by position) from public.recipe_ingredients where recipe_id = :'rid'), array[0, 1]::smallint[], 'positions follow the list order');
select lives_ok(format($$ update public.recipes set status = 'published' where id = %L $$, :'rid'), 'complete recipe publishes');
select isnt((select published_at from public.recipes where id = :'rid'), null, 'published_at is set');

-- reordering keeps ids (and so step photos)
select (select id from public.recipe_ingredients where recipe_id = :'rid' and position = 0) as ing0 \gset
select lives_ok(format($$ select public.save_recipe_items(%L,
    jsonb_build_array(jsonb_build_object('item_text','Salt','unit_code','to_taste'), jsonb_build_object('id', %L::text, 'item_text','Fish','amount',0.5,'unit_code','kg')),
    '[{"body":"Simmer for 10 minutes.","timer_seconds":600}]') $$, :'rid', :'ing0'), 'reordering through autosave works (deferred unique positions)');
select is((select position from public.recipe_ingredients where id = :'ing0'), 1::smallint, 'an existing row keeps its id when moved');

-- ── published recipes are public ──────────────────────
select tests.act_as(null);
select is((select count(*)::int from public.recipes where id = :'rid'), 1, 'anon sees a published recipe');
select is((select count(*)::int from public.recipe_steps where recipe_id = :'rid'), 1, 'anon sees its steps');

-- ── nobody else can change it ─────────────────────────
select tests.act_as(:'other');
update public.recipes set title_en = 'Hacked' where id = :'rid';
select throws_ok(format($$ select public.save_recipe_items(%L, '[]', '[]') $$, :'rid'), '42501', 'errors.forbidden', 'another user cannot autosave into it');
select throws_ok(format($$ insert into public.recipe_steps (recipe_id, position, body) values (%L, 9, 'Spam') $$, :'rid'), '42501', null, 'another user cannot add steps');
delete from public.recipe_ingredients where recipe_id = :'rid';
delete from public.recipes where id = :'rid';
select tests.act_as_owner();
select is((select title_en from public.recipes where id = :'rid'), 'Fish curry', 'another user cannot edit it');
select is((select count(*)::int from public.recipe_ingredients where recipe_id = :'rid'), 2, 'another user cannot delete its ingredients');
select is((select count(*)::int from public.recipes where id = :'rid'), 1, 'another user cannot delete it');

-- ── suspended users cannot write ──────────────────────
update public.profiles set status = 'suspended' where id = :'cook';
select tests.act_as(:'cook');
select throws_ok($$ insert into public.recipes (author_id, title_en) values (auth.uid(), 'While suspended') $$, '42501', null, 'a suspended user cannot create recipes');
update public.recipes set title_en = 'Edited while suspended' where id = :'rid';
select tests.act_as_owner();
select is((select title_en from public.recipes where id = :'rid'), 'Fish curry', 'a suspended user cannot edit');
update public.profiles set status = 'active' where id = :'cook';

-- ── deletion and media clean-up ───────────────────────
update public.recipes set cover_path = 'recipes/test/cover' where id = :'rid';
select tests.act_as(:'modr');
delete from public.recipes where id = :'rid';
select tests.act_as_owner();
select is((select count(*)::int from public.recipes where id = :'rid'), 1, 'a moderator cannot delete (they hide, in M6)');
select tests.act_as(:'adm');
delete from public.recipes where id = :'rid';
select tests.act_as_owner();
select is((select count(*)::int from public.recipes where id = :'rid'), 0, 'an admin can delete');
select ok(exists (select 1 from private.media_trash where base_path = 'recipes/test/cover'), 'the deleted cover is queued for clean-up');

-- ── storage buckets ───────────────────────────────────
select tests.act_as(:'cook');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner) values ('incoming', %L, auth.uid()) $$, :'cook' || '/photo.jpg'), 'upload into your own incoming folder');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('incoming', %L) $$, :'other' || '/photo.jpg'), '42501', null, 'cannot upload into someone else''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('public-media', 'recipes/x.webp') $$, '42501', null, 'users cannot write the public bucket');

select * from finish();
rollback;
