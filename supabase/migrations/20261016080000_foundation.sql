-- Foundation: schemas, extensions, shared types and helpers.
-- Conventions: docs/DATABASE.md. Every table in `public` has RLS enabled and explicit grants
-- (auto_expose_new_tables = false), so nothing is reachable through the API by accident.

-- ── schemas ───────────────────────────────────────────────────────────────
-- `private` holds helper functions and internal tables. PostgREST does not expose it.
create schema if not exists private;
revoke all on schema private from public;
-- Policies run with the caller's privileges, so API roles need USAGE to call private helper
-- functions. They get EXECUTE only on the specific helpers granted below, never on tables here.
grant usage on schema private to anon, authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;

-- ── extensions ────────────────────────────────────────────────────────────
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ── shared enum types ─────────────────────────────────────────────────────
create type public.user_role as enum ('user', 'moderator', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.lang as enum ('ml', 'en');

-- ── helpers ───────────────────────────────────────────────────────────────
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
