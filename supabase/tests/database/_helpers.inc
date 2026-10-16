-- Shared pgTAP helpers. Included at the top of each *.test.sql with `\ir _helpers.inc`, inside the -- test's
own transaction, so they never exist outside a test run. create schema if not exists tests; create or replace
function tests.create_user(email text, meta jsonb default '{}'::jsonb) returns uuid language plpgsql security
definer set search_path = '' as $$ declare uid uuid := gen_random_uuid(); begin insert into auth.users (id,
instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at) values (uid,
'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, meta, now(), now(), now());
return uid; end; $$; -- Act as a signed-in user for the rest of the transaction; pass null to act as an
anonymous visitor. create or replace function tests.act_as(uid uuid) returns void language plpgsql as $$ begin
if uid is null then perform set_config('request.jwt.claims', '{"role":"anon"}', true); execute 'set local role
anon'; else perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role',
'authenticated')::text, true); execute 'set local role authenticated'; end if; end; $$; create or replace
function tests.act_as_owner() returns void language plpgsql as $$ begin execute 'reset role'; perform
set_config('request.jwt.claims', '', true); end; $$; grant usage on schema tests to anon, authenticated; grant
execute on all functions in schema tests to anon, authenticated;
