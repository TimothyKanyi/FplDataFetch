-- Migration: enable RLS on the cache tables.
--
-- The Supabase Advisor flags these tables because they are public with RLS
-- disabled, meaning anyone with the anon key could read/write them directly via
-- PostgREST. All access happens through Edge Functions (which use the
-- service-role key and therefore bypass RLS), so we enable RLS and add NO
-- policies — direct anon access is denied by default.

alter table public.league_cache enable row level security;
alter table public.league_history enable row level security;
