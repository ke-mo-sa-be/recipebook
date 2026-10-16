begin;
\ir _helpers.inc
select plan(20);

-- ── setup ─────────────────────────────────────────────
select tests.create_user('amma@example.com', '{"display_name":"Amma","lang":"ml"}') as amma \gset
select tests.create_user('appu@example.com', '{"full_name":"Appu K","lang":"en"}') as appu \gset
select tests.create_user('mod@example.com',  '{"display_name":"Mod"}') as modr \gset
select tests.create_user('nameless@example.com') as nameless \gset
update public.profiles set role = 'moderator' where id = :'modr';

-- ── trigger: profile created on sign-up ───────────────
select is((select display_name from public.profiles where id = :'amma'), 'Amma', 'display name comes from sign-up metadata');
select is((select preferred_lang::text from public.profiles where id = :'appu'), 'en', 'language comes from sign-up metadata');
select is((select handle from public.profiles where id = :'appu'), 'appuk', 'handle is derived from the name');
select ok((select handle from public.profiles where id = :'nameless') ~ '^cook(_\d{4})?$', 'no name → "cook" handle');
select is((select display_name from public.profiles where id = :'nameless'), 'Cook', 'email is never used for public fields');
select is((select role::text from public.profiles where id = :'amma'), 'user', 'new users get role user');

-- ── anon ──────────────────────────────────────────────
select tests.act_as(null);
select ok((select count(*) from public.profiles) >= 4, 'anon can read profiles');
select throws_ok($$ update public.profiles set bio = 'x' $$, '42501', null, 'anon cannot update profiles');
select throws_ok($$ insert into public.profiles (id, handle, display_name) values (gen_random_uuid(), 'zzz', 'Z') $$, '42501', null, 'anon cannot insert profiles');

-- ── a signed-in user ──────────────────────────────────
select tests.act_as(:'amma');
select lives_ok($$ update public.profiles set bio = 'I cook sadya' where id = auth.uid() $$, 'user can update own bio');
select is((select bio from public.profiles where id = :'amma'), 'I cook sadya', 'own bio was saved');

update public.profiles set bio = 'hacked' where id = :'appu';
select tests.act_as_owner();
select is((select bio from public.profiles where id = :'appu'), null, 'user cannot update someone else''s profile');
select tests.act_as(:'amma');

select throws_ok($$ update public.profiles set role = 'admin' where id = auth.uid() $$, '42501', null, 'user cannot change own role');
select throws_ok($$ update public.profiles set status = 'active', suspended_until = null where id = auth.uid() $$, '42501', null, 'user cannot change own status');
select throws_ok($$ delete from public.profiles where id = auth.uid() $$, '42501', null, 'user cannot delete profiles directly');
select throws_ok($$ update public.profiles set handle = 'Bad Handle' where id = auth.uid() $$, '23514', null, 'handle format is enforced');

-- ── helpers ───────────────────────────────────────────
select ok(not private.is_mod(), 'regular user is not a moderator');
select tests.act_as(:'modr');
select ok(private.is_mod() and not private.is_admin(), 'moderator is mod but not admin');

-- ── suspension takes effect immediately ───────────────
select tests.act_as_owner();
update public.profiles set status = 'suspended' where id = :'amma';
select tests.act_as(:'amma');
update public.profiles set bio = 'still here?' where id = auth.uid();
select tests.act_as_owner();
select is((select bio from public.profiles where id = :'amma'), 'I cook sadya', 'suspended user cannot edit their profile');

-- ── access-token hook ─────────────────────────────────
select is(
  private.custom_access_token_hook(json_build_object('user_id', :'modr', 'claims', json_build_object('sub', :'modr'))::jsonb)
    -> 'claims' ->> 'user_role',
  'moderator',
  'token hook adds the user_role claim'
);

select * from finish();
rollback;
