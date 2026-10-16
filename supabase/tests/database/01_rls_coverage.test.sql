-- Guard rails that apply to every table, present and future.
begin;
select plan(3);

select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'every table in public has row level security enabled'
);

select is_empty(
  $$ select c.relname
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'private' and c.relkind in ('r', 'v', 'm')
        and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select')) $$,
  'no table in private is readable by API roles'
);

select is_empty(
  $$ select p.proname
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'every security definer function in public pins its search_path'
);

select * from finish();
rollback;
