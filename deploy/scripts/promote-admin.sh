#!/usr/bin/env bash
# Give an existing account the moderator or admin role.
# There is deliberately no UI or API for the first admin: run this on the server.
#
#   deploy/scripts/promote-admin.sh <handle> [admin|moderator|user]
#
# Uses host `psql` with DATABASE_URL (default: the local Supabase CLI database). Without psql on the
# host it runs psql inside the database container instead (DB_CONTAINER, default supabase_db_recipebook).
# For production, export the connection string or container name first (never commit it).
set -euo pipefail

handle="${1:?usage: promote-admin.sh <handle> [admin|moderator|user]}"
role="${2:-admin}"
case "$role" in admin|moderator|user) ;; *) echo "role must be admin, moderator or user" >&2; exit 2 ;; esac
db="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if command -v psql >/dev/null; then
  run_psql() { psql "$db" "$@"; }
else
  run_psql() { docker exec -i "${DB_CONTAINER:-supabase_db_recipebook}" psql -U postgres "$@"; }
fi

run_psql -v ON_ERROR_STOP=1 -v handle="$handle" -v role="$role" <<'SQL'
\set QUIET on
update public.profiles set role = :'role'::public.user_role where handle = lower(:'handle')
returning handle, display_name, role;
SQL
echo "Done. The person must sign out and in again (or wait up to an hour) for the app to show the new role."
