-- Profiles, roles and the access-token hook.
-- One profile per auth user, created by trigger. Users can edit only the columns granted below;
-- role and status change only through privileged code (RPCs added in M6, or deploy/scripts/promote-admin.sh).

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  handle          text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name    text not null check (char_length(btrim(display_name)) between 1 and 60),
  avatar_path     text check (char_length(avatar_path) <= 300),
  bio             text check (char_length(bio) <= 280),
  district        text check (district in ('tvm','klm','pta','alp','ktm','idk','ekm','tsr','pkd','mlp','kkd','wyd','knr','ksd','other')),
  preferred_lang  public.lang not null default 'ml',
  text_size       text not null default 'normal' check (text_size in ('normal', 'large', 'xl')),
  onboarded_at    timestamptz,                 -- set once the person has confirmed their handle and name
  role            public.user_role not null default 'user',
  status          public.account_status not null default 'active',
  suspended_until timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.profiles is 'Public profile for each auth user. No email or other private data lives here.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ── grants: explicit, column-level for updates ────────────────────────────
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (handle, display_name, avatar_path, bio, district, preferred_lang, text_size, onboarded_at)
  on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ── role / status helpers (authoritative: read the table, never the JWT) ──
-- security definer so they work regardless of the caller's RLS view; `stable` so Postgres can
-- evaluate them once per statement when policies wrap them in (select ...).
create function private.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.status = 'active' or (p.suspended_until is not null and p.suspended_until < now()))
  );
$$;

create function private.has_role(min_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- enum order is user < moderator < admin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role >= min_role
  );
$$;

create function private.is_mod()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.has_role('moderator'); $$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.has_role('admin'); $$;

grant execute on function private.is_active(), private.has_role(public.user_role), private.is_mod(), private.is_admin()
  to anon, authenticated, service_role;

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "people update their own profile while active"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and (select private.is_active()))
  with check (id = (select auth.uid()));

-- No insert/delete policies: rows are created by the trigger below and removed by
-- deleting the auth user (cascade), which only the delete-account Edge Function can do.

-- ── create a profile for every new auth user ──────────────────────────────
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := btrim(coalesce(meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name', ''));
  base text;
  candidate text;
  lang public.lang := case when meta ->> 'lang' in ('ml', 'en') then (meta ->> 'lang')::public.lang else 'ml' end;
begin
  -- Never derive public fields from the email address: it would leak it.
  name := left(coalesce(nullif(name, ''), 'Cook'), 60);

  -- Handle: ascii letters/digits/underscore from the name (Malayalam-only names fall back to "cook");
  -- people confirm or change it on first sign-in.
  base := left(regexp_replace(lower(name), '[^a-z0-9_]', '', 'g'), 24);
  if char_length(base) < 3 then
    base := 'cook';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    candidate := base || '_' || lpad((floor(random() * 10000))::int::text, 4, '0');
  end loop;

  insert into public.profiles (id, handle, display_name, preferred_lang)
  values (new.id, candidate, name, lang);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── custom access-token hook ──────────────────────────────────────────────
-- Adds user_role and account_status claims so the UI can show admin links and a "suspended"
-- notice without an extra query. RLS never relies on these claims (they are stale until refresh).
create function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  p record;
begin
  select role, status into p from public.profiles where id = (event ->> 'user_id')::uuid;
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(p.role::text, 'user')));
  claims := jsonb_set(claims, '{account_status}', to_jsonb(coalesce(p.status::text, 'active')));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema private to supabase_auth_admin;
grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function private.custom_access_token_hook(jsonb) from anon, authenticated, public;
grant select (id, role, status) on public.profiles to supabase_auth_admin;
create policy "auth server reads roles for the token hook"
  on public.profiles for select
  to supabase_auth_admin
  using (true);
