begin;
\ir _helpers.inc
select plan(31);

select tests.create_user('orig@example.com', '{"display_name":"Original Cook"}') as orig \gset
select tests.create_user('home@example.com', '{"display_name":"Home Cook"}') as home \gset
select tests.create_user('susp@example.com', '{"display_name":"Suspended"}') as susp \gset
update public.profiles set status = 'suspended' where id = :'susp';
select gen_random_uuid() as pub \gset
select gen_random_uuid() as draft \gset

select tests.act_as(:'orig');
insert into public.recipes (id, author_id, title_en, content_lang, category_id, diet, servings, cook_minutes)
values (:'pub', auth.uid(), 'Original Avial', 'en', 2, 'veg', 4, 30), (:'draft', auth.uid(), 'Secret Draft', 'en', 2, 'veg', 2, 10);
select public.save_recipe_items(:'pub', '[{"item_text":"Yam","amount":200,"unit_code":"g"},{"item_text":"Coconut"}]', '[{"body":"Cook.","timer_seconds":600}]');
update public.recipes set status = 'published' where id = :'pub';
insert into public.recipe_tags (recipe_id, tag_id) select :'pub', id from public.tags where slug = 'onam';

-- ── cooked-it posts: only the photo pipeline creates them ──
select tests.act_as(:'home');
select throws_ok(format($$ select public.create_cooked_post(%L, %L, 'cooked/x/y', 'hi') $$, :'home', :'pub'), '42501', null, 'people cannot call create_cooked_post');
select throws_ok(format($$ insert into public.cooked_posts (recipe_id, author_id, photo_path) values (%L, %L, 'cooked/x') $$, :'pub', :'home'), '42501', null, 'nor insert posts directly');
set local role service_role;
select lives_ok(format($$ select public.create_cooked_post(%L, %L, 'cooked/h/1', '  Turned out great  ') $$, :'home', :'pub'), 'the pipeline records a post');
select throws_ok(format($$ select public.create_cooked_post(%L, %L, 'cooked/h/2', null) $$, :'home', :'draft'), '42501', null, 'not on a draft');
select throws_ok(format($$ select public.create_cooked_post(%L, %L, 'cooked/s/1', null) $$, :'susp', :'pub'), '42501', null, 'not from a suspended account');
select public.create_cooked_post(:'home', :'pub', 'cooked/h/' || g, null) from generate_series(3, 6) g;
select throws_ok(format($$ select public.create_cooked_post(%L, %L, 'cooked/h/7', null) $$, :'home', :'pub'), 'P0001', 'cooked.errors.tooFast', 'five posts an hour at most');
reset role;

select tests.act_as(null);
select is((select count(*)::int from public.cooked_posts where recipe_id = :'pub'), 5, 'anyone sees posts on a published recipe');
select is((select note from public.cooked_posts where photo_path = 'cooked/h/1'), 'Turned out great', 'notes are trimmed');
select is((select cooked_count from public.recipe_stats where recipe_id = :'pub'), 5, 'the cooked count follows');
select id as post from public.cooked_posts where photo_path = 'cooked/h/1' \gset

select tests.act_as(:'orig');
update public.cooked_posts set note = 'hacked' where id = :'post';
delete from public.cooked_posts where id = :'post';
select is((select note from public.cooked_posts where id = :'post'), 'Turned out great', 'others cannot edit or delete a post');
select is((select count(*)::int from public.notifications where kind::text = 'cooked'), 5, 'the cook is told about each one');
select tests.act_as(:'home');
select lives_ok(format($$ update public.cooked_posts set note = 'Even better with jaggery' where id = %L $$, :'post'), 'the author edits their note');
select throws_ok(format($$ update public.cooked_posts set photo_path = 'x' where id = %L $$, :'post'), '42501', null, 'but not the photo');
select lives_ok(format($$ delete from public.cooked_posts where id = %L $$, :'post'), 'and deletes their post');
select tests.act_as_owner();
select ok(exists (select 1 from private.media_trash where base_path = 'cooked/h/1'), 'the deleted photo is queued for clean-up');
select is((select cooked_count from public.recipe_stats where recipe_id = :'pub'), 4, 'the count goes back down');

-- ── variations ──
select tests.act_as(null);
select throws_ok(format($$ select public.make_variation(%L) $$, :'pub'), '42501', null, 'anon cannot make a version');
select tests.act_as(:'home');
select throws_ok(format($$ insert into public.recipes (author_id, title_en, parent_recipe_id) values (auth.uid(), 'x', %L) $$, :'pub'), '42501', null, 'parent_recipe_id is set only by make_variation');
select throws_ok(format($$ select public.make_variation(%L) $$, :'draft'), '42501', null, 'cannot copy someone''s draft');
select public.make_variation(:'pub') as v \gset
select is((select status::text from public.recipes where id = :'v'), 'draft', 'my version starts as my draft');
select ok((select author_id = auth.uid() and parent_recipe_id = :'pub' and is_variation from public.recipes where id = :'v'), 'mine, linked to the original');
select is((select count(*)::int from public.recipe_ingredients where recipe_id = :'v'), 2, 'ingredients are copied');
select is((select timer_seconds from public.recipe_steps where recipe_id = :'v'), 600, 'steps are copied with their timers');
select is((select count(*)::int from public.recipe_tags where recipe_id = :'v'), 1, 'tags are copied');
select is((select variation_count from public.recipe_stats where recipe_id = :'pub'), 0, 'a draft version is not counted yet');
update public.recipes set status = 'published' where id = :'v';
select is((select variation_count from public.recipe_stats where recipe_id = :'pub'), 1, 'publishing it counts');
select tests.act_as(:'orig');
select is((select count(*)::int from public.notifications where kind::text = 'variation' and recipe_id = :'v'), 1, 'and tells the original cook');
select tests.act_as(:'home');
update public.recipes set status = 'draft' where id = :'v';
select is((select variation_count from public.recipe_stats where recipe_id = :'pub'), 0, 'unpublishing uncounts');
update public.recipes set status = 'published' where id = :'v';
select tests.act_as(:'orig');
select lives_ok(format($$ select public.make_variation(%L) $$, :'draft'), 'you can make a version of your own draft');
select lives_ok(format($$ delete from public.recipes where id = %L $$, :'pub'), 'the original can be deleted');
select tests.act_as(null);
select ok((select parent_recipe_id is null and is_variation from public.recipes where id = :'v'), 'the version stays, marked as "original removed"');

select * from finish();
rollback;
