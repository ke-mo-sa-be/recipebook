-- M4 part 2: "I cooked this" photo posts and "Make my version" variations, with counts and
-- notifications.

-- New notification kinds. ADD VALUE can't be used in the same transaction, so the function bodies
-- below only reference them as text that is resolved when they run.
alter type public.notification_kind add value if not exists 'cooked';
alter type public.notification_kind add value if not exists 'variation';

alter table public.recipe_stats
  add column cooked_count int not null default 0 check (cooked_count >= 0),
  add column variation_count int not null default 0 check (variation_count >= 0);

-- ── cooked-it posts ──────────────────────────────────────────────────────────
-- Created only by the process-image function (it owns the photo pipeline), through
-- create_cooked_post below; people can edit their note and delete their post.
create table public.cooked_posts (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes on delete cascade,
  author_id  uuid not null references public.profiles on delete cascade,
  photo_path text not null check (char_length(photo_path) <= 200),
  note       text check (char_length(note) <= 140),
  mod_state  public.mod_state not null default 'visible', -- moderators hide (M6)
  created_at timestamptz not null default now()
);
create index cooked_posts_recipe on public.cooked_posts (recipe_id, created_at desc);
create index cooked_posts_author on public.cooked_posts (author_id, created_at desc);

create trigger cooked_posts_trash_photo after update of photo_path or delete on public.cooked_posts
  for each row execute function private.trash_replaced_media('photo_path');

-- Service role only (process-image). Checks what RLS would check for a person, plus a limit of
-- five posts an hour, then records the post with its already-processed photo.
create function public.create_cooked_post(author uuid, recipe uuid, photo text, note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = author and (p.status = 'active' or (p.suspended_until is not null and p.suspended_until < now()))
  ) then
    raise exception using errcode = '42501', message = 'errors.forbidden';
  end if;
  if not private.is_public_recipe(recipe) then
    raise exception using errcode = '42501', message = 'errors.forbidden';
  end if;
  if (select count(*) from public.cooked_posts c where c.author_id = author and c.created_at > now() - interval '1 hour') >= 5 then
    raise exception using errcode = 'P0001', message = 'cooked.errors.tooFast';
  end if;
  insert into public.cooked_posts (recipe_id, author_id, photo_path, note)
  values (recipe, author, photo, nullif(btrim(note), ''))
  returning id into new_id;
  return new_id;
end;
$$;

create function private.cooked_posts_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.note := nullif(btrim(new.note), '');
  return new;
end;
$$;
create trigger cooked_posts_before_update before update on public.cooked_posts
  for each row execute function private.cooked_posts_before_update();

-- ── variations ───────────────────────────────────────────────────────────────
-- Copies a published recipe (or your own) into a new draft of yours, linked to the original. Photos
-- are not copied: they belong to the original cook, and yours come from your own kitchen.
create function public.make_variation(source uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  src public.recipes;
  new_id uuid := gen_random_uuid();
begin
  if me is null or not private.is_active() then
    raise exception using errcode = '42501', message = 'errors.forbidden';
  end if;
  select * into src from public.recipes r where r.id = source;
  if src.id is null or not (private.is_public_recipe(source) or src.author_id = me) then
    raise exception using errcode = '42501', message = 'errors.forbidden';
  end if;
  insert into public.recipes (id, author_id, title_ml, title_en, description, content_lang, category_id, region_id,
    diet, prep_minutes, cook_minutes, servings, yield_label, tips, parent_recipe_id, is_variation)
  values (new_id, me, src.title_ml, src.title_en, src.description, src.content_lang, src.category_id, src.region_id,
    src.diet, src.prep_minutes, src.cook_minutes, src.servings, src.yield_label, src.tips, src.id, true);
  insert into public.recipe_ingredients (recipe_id, position, group_label, amount, amount_max, unit_code, ingredient_id, item_text, note)
  select new_id, position, group_label, amount, amount_max, unit_code, ingredient_id, item_text, note
  from public.recipe_ingredients where recipe_id = src.id;
  insert into public.recipe_steps (recipe_id, position, body, timer_seconds)
  select new_id, position, body, timer_seconds from public.recipe_steps where recipe_id = src.id;
  insert into public.recipe_tags (recipe_id, tag_id) select new_id, tag_id from public.recipe_tags where recipe_id = src.id;
  return new_id;
end;
$$;

-- Published variations count towards the original, and the original's cook is told once each is
-- published (not while it's a draft).
create function private.variation_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was boolean := tg_op <> 'INSERT' and old.parent_recipe_id is not null and old.status = 'published';
  now_pub boolean := tg_op <> 'DELETE' and new.parent_recipe_id is not null and new.status = 'published';
  parent uuid;
  parent_author uuid;
begin
  if was and not now_pub then
    update public.recipe_stats set variation_count = greatest(variation_count - 1, 0)
    where recipe_id = old.parent_recipe_id
      and exists (select 1 from public.recipes r where r.id = old.parent_recipe_id);
  elsif now_pub and not was then
    parent := new.parent_recipe_id;
    update public.recipe_stats set variation_count = variation_count + 1 where recipe_id = parent;
    select r.author_id into parent_author from public.recipes r where r.id = parent;
    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (user_id, actor_id, kind, recipe_id)
      values (parent_author, new.author_id, 'variation'::text::public.notification_kind, new.id);
    end if;
  end if;
  return null;
end;
$$;
create trigger recipes_variation_events after insert or update of status, parent_recipe_id or delete on public.recipes
  for each row execute function private.variation_events();

-- ── counters and notifications for cooked posts ──────────────────────────────
create function private.cooked_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  if tg_op = 'DELETE' then
    update public.recipe_stats set cooked_count = greatest(cooked_count - 1, 0)
    where recipe_id = old.recipe_id and exists (select 1 from public.recipes r where r.id = old.recipe_id);
    return null;
  end if;
  update public.recipe_stats set cooked_count = cooked_count + 1 where recipe_id = new.recipe_id;
  select r.author_id into author from public.recipes r where r.id = new.recipe_id;
  if author is not null and author <> new.author_id then
    insert into public.notifications (user_id, actor_id, kind, recipe_id)
    values (author, new.author_id, 'cooked'::text::public.notification_kind, new.recipe_id);
  end if;
  return null;
end;
$$;
create trigger cooked_posts_events after insert or delete on public.cooked_posts
  for each row execute function private.cooked_events();

-- Variations already published before this migration (none in the seed) start counted.
update public.recipe_stats s set variation_count = x.n
from (select parent_recipe_id, count(*) n from public.recipes
      where parent_recipe_id is not null and status = 'published' group by 1) x
where s.recipe_id = x.parent_recipe_id;

-- ── push wording needs to know the variation's title too ─────────────────────
-- (claim_push_batch already returns the recipe the notification points at: for a variation that is
-- the new version, for cooked posts the original.)

-- ── access ───────────────────────────────────────────────────────────────────
alter table public.cooked_posts enable row level security;
revoke all on public.cooked_posts from public, anon, authenticated;
grant select on public.cooked_posts to anon, authenticated;
grant update (note), delete on public.cooked_posts to authenticated;
grant all on public.cooked_posts to service_role;

create policy "visible on a readable recipe, own, or moderator" on public.cooked_posts for select to anon, authenticated
  using ((mod_state = 'visible' and (select private.can_read_recipe(recipe_id)))
         or author_id = (select auth.uid()) or (select private.is_mod()));
create policy "edit own note" on public.cooked_posts for update to authenticated
  using (author_id = (select auth.uid()) and (select private.is_active()))
  with check (author_id = (select auth.uid()));
create policy "delete own, or moderator" on public.cooked_posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_mod()));

revoke execute on function public.create_cooked_post(uuid, uuid, text, text), public.make_variation(uuid) from public;
grant execute on function public.create_cooked_post(uuid, uuid, text, text) to service_role;
grant execute on function public.make_variation(uuid) to authenticated;
