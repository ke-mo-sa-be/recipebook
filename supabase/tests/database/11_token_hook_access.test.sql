begin;
select plan(2);
select ok(not has_function_privilege('authenticated', 'private.custom_access_token_hook(jsonb)', 'execute'),
  'signed-in users cannot call the token hook');
select ok(has_function_privilege('supabase_auth_admin', 'private.custom_access_token_hook(jsonb)', 'execute'),
  'the auth server can call the token hook');
select * from finish();
rollback;
