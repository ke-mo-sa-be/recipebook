begin;
\ir _helpers.inc
select plan(48);

select tests.create_user('chef@example.com', '{"display_name":"Chef"}') as chef \gset
select tests.create_user('fan@example.com', '{"display_name":"Fan"}') as fan \gset
select tests.create_user('lurker@example.com', '{"display_name":"Lurker"}') as lurker \gset
select tests.create_user('mod4@example.com', '{"display_name":"Mod"}') as modr \gset
update public.profiles set role = 'moderator' where id = :'modr';
select gen_random_uuid() as pub \gset
select gen_random_uuid() as draft \gset

-- A published recipe and a draft by the chef.
select tests.act_as(:'chef');
insert into public.recipes (id, author_id, title_en, content_lang, category_id, diet, servings)
values (:'pub', auth.uid(), 'Community Curry', 'en', 2, 'veg', 2), (:'draft', auth.uid(), 'Secret Draft', 'en', 2, 'veg', 2);
select public.save_recipe_items(:'pub', '[{"item_text":"Salt","unit_code":"to_taste"}]', '[{"body":"Cook."}]');
update public.recipes set status = 'published' where id = :'pub';
select is((select like_count from public.recipe_stats where recipe_id = :'pub'), 0, 'new recipes get a stats row');

-- ── likes ──
select tests.act_as(null);
select throws_ok(format($$ insert into public.likes (recipe_id) values (%L) $$, :'pub'), '42501', null, 'anon cannot like');
select tests.act_as(:'fan');
select lives_ok(format($$ insert into public.likes (recipe_id) values (%L) $$, :'pub'), 'a user likes a published recipe');
select throws_ok(format($$ insert into public.likes (recipe_id) values (%L) $$, :'draft'), '42501', null, 'cannot like a draft');
select throws_ok(format($$ insert into public.likes (user_id, recipe_id) values (%L, %L) $$, :'lurker', :'pub'), '42501', null, 'cannot like as someone else');
select is((select like_count from public.recipe_stats where recipe_id = :'pub'), 1, 'the like count goes up at once');
select tests.act_as(:'lurker');
select is((select count(*)::int from public.likes), 0, 'who liked is private');
select is((select like_count from public.recipe_stats where recipe_id = :'pub'), 1, 'but everyone sees the count');
delete from public.likes where recipe_id = :'pub';
select tests.act_as(:'fan');
select is((select count(*)::int from public.likes where recipe_id = :'pub'), 1, 'another user cannot remove my like');
delete from public.likes where recipe_id = :'pub';
select is((select like_count from public.recipe_stats where recipe_id = :'pub'), 0, 'unlike brings the count back down');
insert into public.likes (recipe_id) values (:'pub');

-- ── saves ──
select lives_ok(format($$ insert into public.saves (recipe_id) values (%L) $$, :'pub'), 'a user saves a recipe');
select is((select save_count from public.recipe_stats where recipe_id = :'pub'), 1, 'save count goes up');
select throws_ok(format($$ insert into public.saves (recipe_id) values (%L) $$, :'draft'), '42501', null, 'cannot save someone else''s draft');
select tests.act_as(:'chef');
select lives_ok(format($$ insert into public.saves (recipe_id) values (%L) $$, :'draft'), 'the author can save their own draft');

-- ── comments ──
select tests.act_as(null);
select throws_ok(format($$ insert into public.comments (recipe_id, body) values (%L, 'hi') $$, :'pub'), '42501', null, 'anon cannot comment');
select tests.act_as(:'fan');
select lives_ok(format($$ insert into public.comments (recipe_id, body) values (%L, '  Lovely with appam!  ') $$, :'pub'), 'a user comments');
select is((select body from public.comments where recipe_id = :'pub'), 'Lovely with appam!', 'comments are trimmed');
select throws_ok(format($$ insert into public.comments (recipe_id, body) values (%L, 'sneaky') $$, :'draft'), '42501', null, 'cannot comment on a draft');
select throws_ok(format($$ insert into public.comments (recipe_id, body) values (%L, '   ') $$, :'pub'), '23514', null, 'blank comments are refused');
select throws_ok(format($$ insert into public.comments (recipe_id, author_id, body) values (%L, %L, 'x') $$, :'pub', :'lurker'), '42501', null, 'cannot comment as someone else');
select is((select comment_count from public.recipe_stats where recipe_id = :'pub'), 1, 'comment count goes up');
select id as c1 from public.comments where recipe_id = :'pub' \gset
update public.comments set body = 'Lovely with puttu!' where id = :'c1';
select isnt((select edited_at from public.comments where id = :'c1'), null, 'editing sets edited_at');
select throws_ok(format($$ update public.comments set mod_state = 'hidden' where id = %L $$, :'c1'), '42501', null, 'authors cannot hide or unhide comments');

select tests.act_as(null);
select is((select body from public.comments where id = :'c1'), 'Lovely with puttu!', 'anon reads comments on public recipes');
select tests.act_as(:'lurker');
update public.comments set body = 'hacked' where id = :'c1';
delete from public.comments where id = :'c1';
select tests.act_as_owner();
select is((select body from public.comments where id = :'c1'), 'Lovely with puttu!', 'others cannot edit or delete a comment');
-- a hidden comment is visible only to its author and moderators
update public.comments set mod_state = 'hidden' where id = :'c1';
select tests.act_as(null);
select is((select count(*)::int from public.comments where id = :'c1'), 0, 'hidden comments are hidden from the public');
select tests.act_as(:'fan');
select is((select count(*)::int from public.comments where id = :'c1'), 1, 'the author still sees their hidden comment');
select tests.act_as(:'modr');
select is((select count(*)::int from public.comments where id = :'c1'), 1, 'moderators see hidden comments');
select tests.act_as_owner();
update public.comments set mod_state = 'visible' where id = :'c1';

-- rate limit: ten comments per ten minutes
select tests.act_as(:'fan');
insert into public.comments (recipe_id, body) select :'pub', 'spam ' || g from generate_series(1, 9) g;
select throws_ok(format($$ insert into public.comments (recipe_id, body) values (%L, 'one too many') $$, :'pub'), 'P0001', 'comment.errors.tooFast', 'the eleventh comment in ten minutes is refused');

-- suspended users
select tests.act_as_owner();
update public.profiles set status = 'suspended' where id = :'lurker';
select tests.act_as(:'lurker');
select throws_ok(format($$ insert into public.likes (recipe_id) values (%L) $$, :'pub'), '42501', null, 'a suspended user cannot like');
select throws_ok(format($$ insert into public.comments (recipe_id, body) values (%L, 'x') $$, :'pub'), '42501', null, 'a suspended user cannot comment');
select tests.act_as_owner();
update public.profiles set status = 'active' where id = :'lurker';

-- counts cannot be written by users
select tests.act_as(:'chef');
select throws_ok(format($$ update public.recipe_stats set like_count = 999 where recipe_id = %L $$, :'pub'), '42501', null, 'users cannot write counts');

-- ── notifications ──
select tests.act_as(:'chef');
select is((select count(*)::int from public.notifications where kind = 'like'), 1, 'the author is told about the like once');
select is((select count(*)::int from public.notifications where kind = 'comment'), 10, 'and about each comment');
select tests.act_as(:'fan');
delete from public.likes where recipe_id = :'pub';
insert into public.likes (recipe_id) values (:'pub');
select is((select count(*)::int from public.notifications), 0, 'others cannot read my notifications');
select tests.act_as(:'chef');
select is((select count(*)::int from public.notifications where kind = 'like'), 1, 'unlike and like again does not notify twice');
insert into public.likes (recipe_id) values (:'pub');
select is((select count(*)::int from public.notifications where actor_id = :'chef'), 0, 'liking your own recipe tells nobody');
update public.notifications set read_at = now();
select is((select count(*)::int from public.notifications where read_at is null), 0, 'mark all as read');
select throws_ok($$ update public.notifications set kind = 'comment' $$, '42501', null, 'only read_at can be changed');
select throws_ok(format($$ insert into public.notifications (user_id, actor_id, kind, recipe_id) values (%L, %L, 'like', %L) $$, :'chef', :'fan', :'pub'), '42501', null, 'users cannot write notifications');

-- ── push subscriptions ──
select tests.act_as(:'fan');
select lives_ok($$ select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/abc123', repeat('B', 87), repeat('a', 22)) $$, 'a user registers a device');
select throws_ok($$ select public.save_push_subscription('https://evil.example.com/hook', repeat('B', 87), repeat('a', 22)) $$, '23514', null, 'only known push services are accepted');
select tests.act_as(:'lurker');
select lives_ok($$ select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/abc123', repeat('C', 87), repeat('b', 22)) $$, 'a device that changes hands moves to the new account');
select is((select count(*)::int from public.push_subscriptions), 1, 'and is now theirs');
select tests.act_as(:'fan');
select is((select count(*)::int from public.push_subscriptions), 0, 'and no longer the old account''s');
select throws_ok($$ select * from public.claim_push_batch(10) $$, '42501', null, 'only the push function can claim notifications');

-- ── popular this week ──
select tests.act_as(null);
select is((select id from public.popular_recipes(7) limit 1), :'pub'::uuid, 'the liked and saved recipe is popular');

-- ── deleting accounts that liked, saved and commented on each other's recipes ──
-- (account deletion, M6): the cascades reach recipe_stats by several paths in one statement.
select tests.act_as_owner();
select lives_ok(format($$ delete from auth.users where id in (%L, %L) $$, :'chef', :'fan'), 'deleting a cook and their fan together works');

select * from finish();
rollback;
