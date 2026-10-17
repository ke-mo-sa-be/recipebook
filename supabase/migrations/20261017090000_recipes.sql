-- M2: recipes, their ingredients and steps, lookups, the ingredient dictionary, storage buckets
-- and the media clean-up queue. Reference rows (units, categories, regions, tags, dictionary) are
-- loaded by the generated migration that follows this one.
-- Design: docs/DATABASE.md. Every table: RLS on, explicit grants (auto_expose_new_tables = false).

-- ── enums ─────────────────────────────────────────────────────────────────
create type public.recipe_status as enum ('draft', 'published');
create type public.mod_state as enum ('visible', 'hidden');
create type public.diet as enum ('veg', 'egg', 'nonveg', 'vegan');
create type public.source_type as enum ('manual', 'import', 'voice', 'scan'); -- voice/scan: v1.5

-- ── lookups (names come from the app's i18n files: categories.<slug>, …) ─────
create table public.categories (
  id      smallint primary key,
  slug    text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sort    smallint not null,
  sticker text not null -- public/stickers/<sticker>.webp, also the no-photo fallback art
);

create table public.regions (
  id   smallint primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  grp  text not null check (grp in ('kerala', 'india', 'world')),
  sort smallint not null
);

create table public.tags (
  id   smallint primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind text not null default 'general' check (kind in ('general', 'festival', 'diet')) -- diet: v2
);

-- Mirrors UNITS in packages/core/src/measures.ts (the generated reference migration keeps them in sync).
create table public.units (
  code        text primary key check (code ~ '^[a-z_]+$'),
  kind        text not null check (kind in ('volume', 'mass', 'count', 'vague')),
  scalable    boolean not null,
  ml          numeric,
  g           numeric,
  traditional boolean not null default false,
  whole       boolean not null default false
);

create table public.ingredients (
  id         int generated always as identity primary key,
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en    text not null check (char_length(name_en) between 1 and 80),
  name_ml    text not null check (char_length(name_ml) between 1 and 80),
  aliases    text[] not null default '{}', -- Manglish and other spellings
  grp        text not null check (grp in ('spice', 'vegetable', 'fruit', 'grain', 'pulse', 'dairy', 'meat', 'seafood', 'oil', 'sweetener', 'nut', 'herb', 'other')),
  sticker    text, -- null → the group's default sticker in the UI
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger ingredients_set_updated_at before update on public.ingredients
  for each row execute function private.set_updated_at();

-- ── recipes ───────────────────────────────────────────────────────────────
create table public.recipes (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles (id) on delete cascade,
  slug             text not null default 'recipe', -- cosmetic; URL is /r/:id/:slug
  title_ml         text check (char_length(title_ml) <= 120),
  title_en         text check (char_length(title_en) <= 120),
  description      text check (char_length(description) <= 500),
  content_lang     public.lang not null default 'ml',
  category_id      smallint references public.categories (id),
  region_id        smallint references public.regions (id),
  diet             public.diet,
  prep_minutes     smallint check (prep_minutes between 0 and 1440),
  cook_minutes     smallint check (cook_minutes between 0 and 2880),
  total_minutes    smallint generated always as (coalesce(prep_minutes, 0) + coalesce(cook_minutes, 0)) stored,
  servings         smallint check (servings between 1 and 200),
  yield_label      text check (char_length(yield_label) <= 40),
  cover_path       text, -- base path in public-media; set only by the process-image function
  tips             text check (char_length(tips) <= 2000),
  status           public.recipe_status not null default 'draft',
  mod_state        public.mod_state not null default 'visible', -- moderators only (M6)
  source_type      public.source_type not null default 'manual',
  source_url       text check (source_url ~ '^https?://'),
  parent_recipe_id uuid references public.recipes (id) on delete set null, -- variations (M4)
  is_variation     boolean not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index recipes_feed on public.recipes (published_at desc) where status = 'published' and mod_state = 'visible';
create index recipes_author on public.recipes (author_id, updated_at desc);
create index recipes_category on public.recipes (category_id) where status = 'published';
create index recipes_parent on public.recipes (parent_recipe_id) where parent_recipe_id is not null;
create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function private.set_updated_at();

create table public.recipe_ingredients (
  id            uuid primary key default gen_random_uuid(), -- the client may supply it (autosave upserts)
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  position      smallint not null check (position >= 0),
  group_label   text check (char_length(group_label) <= 60), -- "For grinding"
  amount        numeric(10, 3) check (amount > 0),
  amount_max    numeric(10, 3) check (amount_max > 0),
  unit_code     text references public.units (code),
  ingredient_id int references public.ingredients (id) on delete set null,
  item_text     text not null check (char_length(btrim(item_text)) between 1 and 120),
  note          text check (char_length(note) <= 120),
  constraint recipe_ingredients_position unique (recipe_id, position) deferrable initially deferred,
  constraint amount_range check (amount_max is null or (amount is not null and amount_max >= amount))
);
create index on public.recipe_ingredients (ingredient_id);

create table public.recipe_steps (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  position      smallint not null check (position >= 0),
  body          text not null check (char_length(btrim(body)) between 1 and 2000),
  photo_path    text, -- set only by the process-image function
  timer_seconds int check (timer_seconds between 1 and 86400),
  constraint recipe_steps_position unique (recipe_id, position) deferrable initially deferred
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id    smallint not null references public.tags (id),
  primary key (recipe_id, tag_id)
);

-- ── helpers ───────────────────────────────────────────────────────────────
create function private.can_read_recipe(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = rid
      and ((r.status = 'published' and r.mod_state = 'visible') or r.author_id = auth.uid() or private.is_mod())
  );
$$;

create function private.owns_recipe(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active() and exists (select 1 from public.recipes r where r.id = rid and r.author_id = auth.uid());
$$;

grant execute on function private.can_read_recipe(uuid), private.owns_recipe(uuid) to anon, authenticated, service_role;

-- Latin slug for URLs; Malayalam-only titles get "recipe" (the id is what matters).
create function private.slugify(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(trim(both '-' from left(regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '-', 'g'), 60)), ''), 'recipe');
$$;

-- Publishing needs the essentials; drafts may be incomplete. Error messages are i18n keys.
create function private.recipes_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.slug := private.slugify(coalesce(nullif(new.title_en, ''), new.title_ml));
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published' or new is distinct from old) then
    if coalesce(nullif(btrim(new.title_ml), ''), nullif(btrim(new.title_en), '')) is null then
      raise exception using errcode = 'P0001', message = 'recipe.errors.titleRequired';
    end if;
    if new.category_id is null or new.diet is null or new.servings is null then
      raise exception using errcode = 'P0001', message = 'recipe.errors.basicsRequired';
    end if;
    if not exists (select 1 from public.recipe_ingredients where recipe_id = new.id) then
      raise exception using errcode = 'P0001', message = 'recipe.errors.ingredientsRequired';
    end if;
    if not exists (select 1 from public.recipe_steps where recipe_id = new.id) then
      raise exception using errcode = 'P0001', message = 'recipe.errors.stepsRequired';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;
create trigger recipes_before_write before insert or update on public.recipes
  for each row execute function private.recipes_before_write();

-- Autosave for the wizard: replace a recipe's ingredients and steps in one call. Rows keep their ids
-- (so step photos survive reordering); rows missing from the lists are deleted. Runs as the caller,
-- so RLS still decides what they may change.
create function public.save_recipe_items(p_recipe uuid, p_ingredients jsonb, p_steps jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.owns_recipe(p_recipe) then
    raise exception using errcode = '42501', message = 'errors.forbidden';
  end if;
  set constraints all deferred;

  delete from public.recipe_ingredients
  where recipe_id = p_recipe
    and id not in (select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p_ingredients, '[]')) e where e ? 'id');
  insert into public.recipe_ingredients (id, recipe_id, position, group_label, amount, amount_max, unit_code, ingredient_id, item_text, note)
  select coalesce((e ->> 'id')::uuid, gen_random_uuid()), p_recipe, (ord - 1)::smallint,
         nullif(e ->> 'group_label', ''), (e ->> 'amount')::numeric, (e ->> 'amount_max')::numeric,
         nullif(e ->> 'unit_code', ''), (e ->> 'ingredient_id')::int, e ->> 'item_text', nullif(e ->> 'note', '')
  from jsonb_array_elements(coalesce(p_ingredients, '[]')) with ordinality as t(e, ord)
  on conflict (id) do update set
    position = excluded.position, group_label = excluded.group_label, amount = excluded.amount,
    amount_max = excluded.amount_max, unit_code = excluded.unit_code, ingredient_id = excluded.ingredient_id,
    item_text = excluded.item_text, note = excluded.note
  where public.recipe_ingredients.recipe_id = p_recipe;

  delete from public.recipe_steps
  where recipe_id = p_recipe
    and id not in (select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p_steps, '[]')) e where e ? 'id');
  insert into public.recipe_steps (id, recipe_id, position, body, timer_seconds)
  select coalesce((e ->> 'id')::uuid, gen_random_uuid()), p_recipe, (ord - 1)::smallint, e ->> 'body', (e ->> 'timer_seconds')::int
  from jsonb_array_elements(coalesce(p_steps, '[]')) with ordinality as t(e, ord)
  on conflict (id) do update set position = excluded.position, body = excluded.body, timer_seconds = excluded.timer_seconds
  where public.recipe_steps.recipe_id = p_recipe;
end;
$$;

-- ── media clean-up queue (drained by the media-gc Edge Function) ───────────
create table private.media_trash (
  base_path text primary key, -- e.g. recipes/<uid>/<recipe>/<uuid>; files are <base>-{400,800,1600}.webp
  queued_at timestamptz not null default now()
);
revoke all on private.media_trash from public, anon, authenticated;
grant all on private.media_trash to service_role;

create function private.queue_media(path text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.media_trash (base_path) values (path) on conflict do nothing;
$$;

create function private.trash_replaced_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  col text := tg_argv[0];
  old_path text := to_jsonb(old) ->> col;
  new_path text := case when tg_op = 'DELETE' then null else to_jsonb(new) ->> col end;
begin
  if old_path is not null and old_path is distinct from new_path then
    perform private.queue_media(old_path);
  end if;
  return coalesce(new, old);
end;
$$;
create trigger recipes_trash_cover after update of cover_path or delete on public.recipes
  for each row execute function private.trash_replaced_media('cover_path');
create trigger steps_trash_photo after update of photo_path or delete on public.recipe_steps
  for each row execute function private.trash_replaced_media('photo_path');
create trigger profiles_trash_avatar after update of avatar_path or delete on public.profiles
  for each row execute function private.trash_replaced_media('avatar_path');

-- ── grants ────────────────────────────────────────────────────────────────
revoke all on public.categories, public.regions, public.tags, public.units, public.ingredients,
  public.recipes, public.recipe_ingredients, public.recipe_steps, public.recipe_tags from anon, authenticated;
grant select on public.categories, public.regions, public.tags, public.units, public.ingredients to anon, authenticated;
grant insert, update, delete on public.ingredients to authenticated; -- admins only, via RLS
grant select on public.recipes, public.recipe_ingredients, public.recipe_steps, public.recipe_tags to anon, authenticated;
grant insert (id, title_ml, title_en, description, content_lang, category_id, region_id, diet, prep_minutes,
  cook_minutes, servings, yield_label, tips, source_url, author_id)
  on public.recipes to authenticated;
grant update (title_ml, title_en, description, content_lang, category_id, region_id, diet, prep_minutes,
  cook_minutes, servings, yield_label, tips, status, source_url)
  on public.recipes to authenticated;
grant delete on public.recipes to authenticated;
grant insert, update, delete on public.recipe_ingredients, public.recipe_tags to authenticated;
grant insert (id, recipe_id, position, body, timer_seconds), update (position, body, timer_seconds), delete
  on public.recipe_steps to authenticated;
grant execute on function public.save_recipe_items(uuid, jsonb, jsonb) to authenticated;
revoke execute on function public.save_recipe_items(uuid, jsonb, jsonb) from anon, public;
grant all on public.categories, public.regions, public.tags, public.units, public.ingredients,
  public.recipes, public.recipe_ingredients, public.recipe_steps, public.recipe_tags to service_role;

-- Avatars now go through the photo pipeline only (process-image sets avatar_path).
revoke update (avatar_path) on public.profiles from authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.regions enable row level security;
alter table public.tags enable row level security;
alter table public.units enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_tags enable row level security;

create policy "lookups are public" on public.categories for select to anon, authenticated using (true);
create policy "lookups are public" on public.regions for select to anon, authenticated using (true);
create policy "lookups are public" on public.tags for select to anon, authenticated using (true);
create policy "lookups are public" on public.units for select to anon, authenticated using (true);
create policy "dictionary is public" on public.ingredients for select to anon, authenticated using (true);
create policy "admins edit the dictionary" on public.ingredients for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "published, own, or moderator" on public.recipes for select to anon, authenticated
  using ((status = 'published' and mod_state = 'visible') or author_id = (select auth.uid()) or (select private.is_mod()));
create policy "authors create drafts" on public.recipes for insert to authenticated
  with check (author_id = (select auth.uid()) and (select private.is_active()));
create policy "authors edit their own" on public.recipes for update to authenticated
  using (author_id = (select auth.uid()) and (select private.is_active()))
  with check (author_id = (select auth.uid()));
create policy "authors and admins delete" on public.recipes for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_admin()));

create policy "readable with the recipe" on public.recipe_ingredients for select to anon, authenticated
  using (private.can_read_recipe(recipe_id));
create policy "recipe owner writes" on public.recipe_ingredients for all to authenticated
  using (private.owns_recipe(recipe_id)) with check (private.owns_recipe(recipe_id));
create policy "readable with the recipe" on public.recipe_steps for select to anon, authenticated
  using (private.can_read_recipe(recipe_id));
create policy "recipe owner writes" on public.recipe_steps for all to authenticated
  using (private.owns_recipe(recipe_id)) with check (private.owns_recipe(recipe_id));
create policy "readable with the recipe" on public.recipe_tags for select to anon, authenticated
  using (private.can_read_recipe(recipe_id));
create policy "recipe owner writes" on public.recipe_tags for all to authenticated
  using (private.owns_recipe(recipe_id)) with check (private.owns_recipe(recipe_id));

-- ── storage buckets ───────────────────────────────────────────────────────
-- incoming: private; each person writes only to <their uid>/… ; files live minutes (media-gc).
-- public-media: public read; written ONLY by process-image (service role), WebP only, so nothing
-- public can carry EXIF/GPS from a phone camera.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('incoming', 'incoming', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('public-media', 'public-media', true, 1048576, array['image/webp'])
on conflict (id) do nothing;

create policy "upload to own incoming folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'incoming' and (storage.foldername(name))[1] = (select auth.uid()::text) and (select private.is_active()));
create policy "read own incoming files" on storage.objects for select to authenticated
  using (bucket_id = 'incoming' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "delete own incoming files" on storage.objects for delete to authenticated
  using (bucket_id = 'incoming' and (storage.foldername(name))[1] = (select auth.uid()::text));
