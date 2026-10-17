-- Server-only access to the media clean-up queue for the media-gc Edge Function.
-- private.* is not exposed by the API, so these two functions are the only door, and only the
-- service role may call them.

create function public.claim_media_trash(max_rows int default 200)
returns setof text
language sql
security definer
set search_path = ''
as $$
  delete from private.media_trash
  where base_path in (select base_path from private.media_trash order by queued_at limit max_rows)
  returning base_path;
$$;

-- Uploads are processed within seconds; anything left in incoming after a day was abandoned.
create function public.stale_incoming_objects(older_than interval default interval '24 hours', max_rows int default 500)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select name from storage.objects
  where bucket_id = 'incoming' and created_at < now() - older_than
  order by created_at
  limit max_rows;
$$;

revoke execute on function public.claim_media_trash(int), public.stale_incoming_objects(interval, int) from public, anon, authenticated;
grant execute on function public.claim_media_trash(int), public.stale_incoming_objects(interval, int) to service_role;
