-- M4 community: likes, saves, comments, live counts, "popular this week", notifications and
-- web-push subscriptions.
--
-- Counts live in public.recipe_stats, not on recipes: updating a recipe row re-runs its publish check
-- and bumps updated_at, and a like is neither an edit nor a reason to re-check.

create function private.is_public_recipe(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r where r.id = rid and r.status = 'published' and r.mod_state = 'visible'
  );
$$;
grant execute on function private.is_public_recipe(uuid) to anon, authenticated, service_role;

-- ── counts ───────────────────────────────────────────────────────────────────
create table public.recipe_stats (
  recipe_id     uuid primary key references public.recipes on delete cascade,
  like_count    int not null default 0 check (like_count >= 0),
  save_count    int not null default 0 check (save_count >= 0),
  comment_count int not null default 0 check (comment_count >= 0)
);
insert into public.recipe_stats (recipe_id) select id from public.recipes;

create function private.recipes_stats_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.recipe_stats (recipe_id) values (new.id) on conflict do nothing;
  return null;
end;
$$;
create trigger recipes_stats after insert on public.recipes
  for each row execute function private.recipes_stats_row();

-- ── likes and saves ──────────────────────────────────────────────────────────
-- Who liked or saved is private to that person; everyone sees the counts.
create table public.likes (
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  recipe_id  uuid not null references public.recipes on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index likes_recipe on public.likes (recipe_id, created_at);

create table public.saves (
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  recipe_id  uuid not null references public.recipes on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index saves_user on public.saves (user_id, created_at desc);
create index saves_recipe on public.saves (recipe_id, created_at);

-- ── comments ─────────────────────────────────────────────────────────────────
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  mod_state  public.mod_state not null default 'visible', -- moderators hide (M6)
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);
create index comments_recipe on public.comments (recipe_id, created_at);
create index comments_author on public.comments (author_id, created_at desc);

-- Anti-spam until the posting pass and rate limits of M6: ten comments per ten minutes.
create function private.comments_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.comments c
        where c.author_id = new.author_id and c.created_at > now() - interval '10 minutes') >= 10 then
      raise exception using errcode = 'P0001', message = 'comment.errors.tooFast';
    end if;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;
create trigger comments_before_write before insert or update on public.comments
  for each row execute function private.comments_before_write();

-- ── counters ─────────────────────────────────────────────────────────────────
create function private.bump_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d int;
  rid uuid;
begin
  -- Branch on the operation: NEW doesn't exist in a delete trigger, nor OLD in an insert one.
  if tg_op = 'INSERT' then
    d := 1;
    rid := new.recipe_id;
  else
    d := -1;
    rid := old.recipe_id;
  end if;
  -- When the recipe itself is being deleted, its counts go with it. Touching the stats row again in
  -- that same statement would re-check its foreign key against the vanished recipe and fail.
  if not exists (select 1 from public.recipes r where r.id = rid) then
    return null;
  end if;
  if tg_table_name = 'likes' then
    update public.recipe_stats set like_count = greatest(like_count + d, 0) where recipe_id = rid;
  elsif tg_table_name = 'saves' then
    update public.recipe_stats set save_count = greatest(save_count + d, 0) where recipe_id = rid;
  else
    update public.recipe_stats set comment_count = greatest(comment_count + d, 0) where recipe_id = rid;
  end if;
  return null;
end;
$$;
create trigger likes_stats after insert or delete on public.likes
  for each row execute function private.bump_stats();
create trigger saves_stats after insert or delete on public.saves
  for each row execute function private.bump_stats();
create trigger comments_stats after insert or delete on public.comments
  for each row execute function private.bump_stats();

-- ── notifications ────────────────────────────────────────────────────────────
-- Written only by triggers. The `push` Edge Function delivers them to subscribed devices.
create type public.notification_kind as enum ('like', 'comment');

create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles on delete cascade, -- who is told
  actor_id   uuid not null references public.profiles on delete cascade, -- who did it
  kind       public.notification_kind not null,
  recipe_id  uuid not null references public.recipes on delete cascade,
  comment_id uuid references public.comments on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  pushed_at  timestamptz
);
create index notifications_inbox on public.notifications (user_id, created_at desc);
create index notifications_unpushed on public.notifications (created_at) where pushed_at is null;
-- Unlike + like again never notifies twice.
create unique index notifications_like_once on public.notifications (user_id, actor_id, recipe_id) where kind = 'like';

create function private.notify_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select r.author_id into author from public.recipes r where r.id = new.recipe_id;
  -- Branch per table: a like row has user_id, a comment row has author_id.
  if tg_table_name = 'likes' then
    if author is not null and author <> new.user_id then
      insert into public.notifications (user_id, actor_id, kind, recipe_id)
      values (author, new.user_id, 'like', new.recipe_id)
      on conflict do nothing;
    end if;
  elsif author is not null and author <> new.author_id then
    insert into public.notifications (user_id, actor_id, kind, recipe_id, comment_id)
    values (author, new.author_id, 'comment', new.recipe_id, new.id);
  end if;
  return null; -- you liking or commenting on your own recipe tells nobody
end;
$$;
create trigger likes_notify after insert on public.likes
  for each row execute function private.notify_author();
create trigger comments_notify after insert on public.comments
  for each row execute function private.notify_author();

-- ── push subscriptions ───────────────────────────────────────────────────────
-- Endpoints must belong to a known push service, so the push function can never be pointed at an
-- internal address (SSRF).
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  endpoint   text not null unique check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)/'),
  p256dh     text not null check (char_length(p256dh) between 40 and 200),
  auth       text not null check (char_length(auth) between 10 and 100),
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

-- A browser belongs to whoever is signed in on it now, so saving takes the endpoint over.
create function public.save_push_subscription(endpoint text, p256dh text, auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_active() then
    raise exception using errcode = '42501', message = 'errors.forbidden';
  end if;
  delete from public.push_subscriptions s where s.endpoint = save_push_subscription.endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), save_push_subscription.endpoint, save_push_subscription.p256dh, save_push_subscription.auth);
end;
$$;

-- For the `push` function (service role only): claim undelivered notifications from the last hour,
-- with everything needed to word them in the recipient's language and the devices to send them to.
create function public.claim_push_batch(max_rows int default 50)
returns table (
  id bigint, kind public.notification_kind, lang public.lang, actor_name text, recipe_id uuid,
  recipe_slug text, title_ml text, title_en text, comment_body text, unread bigint, subscriptions jsonb
)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.notifications n
    set pushed_at = now()
    where n.id in (
      select n2.id from public.notifications n2
      where n2.pushed_at is null and n2.created_at > now() - interval '1 hour'
      order by n2.created_at
      limit greatest(least(max_rows, 200), 1)
      for update skip locked
    )
    returning n.*
  )
  select c.id, c.kind, p.preferred_lang, a.display_name, r.id, r.slug, r.title_ml, r.title_en,
    left(cm.body, 120),
    (select count(*) from public.notifications u where u.user_id = c.user_id and u.read_at is null),
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
              from public.push_subscriptions s where s.user_id = c.user_id), '[]'::jsonb)
  from claimed c
  join public.profiles p on p.id = c.user_id
  join public.profiles a on a.id = c.actor_id
  join public.recipes r on r.id = c.recipe_id
  left join public.comments cm on cm.id = c.comment_id;
$$;

-- ── popular this week ────────────────────────────────────────────────────────
-- Recipes ranked by likes and saves in the last few days (saves count double: more intent).
create function public.popular_recipes(days int default 7)
returns setof public.recipes
language sql
stable
security definer
set search_path = ''
as $$
  with since as (select now() - make_interval(days => least(greatest(popular_recipes.days, 1), 90)) as t),
  scores as (
    select recipe_id, sum(w) as score from (
      select l.recipe_id, 1 as w from public.likes l, since where l.created_at > since.t
      union all
      select s.recipe_id, 2 from public.saves s, since where s.created_at > since.t
    ) x group by recipe_id
  )
  select r.*
  from scores sc
  join public.recipes r on r.id = sc.recipe_id
  where r.status = 'published' and r.mod_state = 'visible'
  order by sc.score desc, r.published_at desc;
$$;

-- ── access ───────────────────────────────────────────────────────────────────
alter table public.recipe_stats enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on public.recipe_stats, public.likes, public.saves, public.comments, public.notifications,
  public.push_subscriptions from public, anon, authenticated;
grant select on public.recipe_stats to anon, authenticated;
grant select, insert (recipe_id), delete on public.likes, public.saves to authenticated;
grant select on public.comments to anon, authenticated;
grant insert (recipe_id, body), update (body), delete on public.comments to authenticated;
grant select, update (read_at), delete on public.notifications to authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant all on public.recipe_stats, public.likes, public.saves, public.comments, public.notifications,
  public.push_subscriptions to service_role;

create policy "counts follow the recipe" on public.recipe_stats for select to anon, authenticated
  using ((select private.can_read_recipe(recipe_id)));

create policy "own likes" on public.likes for select to authenticated using (user_id = (select auth.uid()));
create policy "like a public recipe" on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active()) and (select private.is_public_recipe(recipe_id)));
create policy "unlike" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "own saves" on public.saves for select to authenticated using (user_id = (select auth.uid()));
create policy "save a readable recipe" on public.saves for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active()) and (select private.can_read_recipe(recipe_id)));
create policy "unsave" on public.saves for delete to authenticated using (user_id = (select auth.uid()));

create policy "visible on a readable recipe, own, or moderator" on public.comments for select to anon, authenticated
  using ((mod_state = 'visible' and (select private.can_read_recipe(recipe_id)))
         or author_id = (select auth.uid()) or (select private.is_mod()));
create policy "comment on a public recipe" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and (select private.is_active()) and (select private.is_public_recipe(recipe_id)));
create policy "edit own" on public.comments for update to authenticated
  using (author_id = (select auth.uid()) and (select private.is_active()))
  with check (author_id = (select auth.uid()));
create policy "delete own, or moderator" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_mod()));

create policy "own inbox" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "mark own read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "clear own" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

create policy "own devices" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "remove own device" on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.save_push_subscription(text, text, text), public.claim_push_batch(int),
  public.popular_recipes(int) from public;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.popular_recipes(int) to anon, authenticated;
grant execute on function public.claim_push_batch(int) to service_role;
