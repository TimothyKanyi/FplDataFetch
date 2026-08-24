-- ============================================================
-- STEP 2: READ-ONLY INVENTORY of league_cache + league_history
-- Run in: Supabase Dashboard -> SQL Editor
-- This query does NOT delete anything. It lists every distinct
-- league_id present, with cache/history metadata, so we can flag
-- test-seed rows vs real leagues before any deletion.
-- ============================================================

-- 2a) Every distinct league_id in league_cache, with row details
SELECT
  league_id,
  start_gw,
  end_gw,
  fetched_at,
  last_queried_at,
  payload->>'leagueName'            AS league_name,
  jsonb_array_length(COALESCE(payload->'leagueData', '[]'::jsonb)) AS manager_count,
  payload->>'currentGameweek'       AS current_gameweek,
  payload->>'isLive'                AS is_live
FROM public.league_cache
ORDER BY league_id, start_gw, end_gw;

-- 2b) Every distinct league_id in league_history, with snapshot details
SELECT
  league_id,
  gameweek,
  created_at,
  standings_snapshot->>'leagueName' AS league_name,
  jsonb_array_length(COALESCE(standings_snapshot->'leagueData', '[]'::jsonb)) AS manager_count,
  standings_snapshot->>'currentGameweek' AS current_gameweek
FROM public.league_history
ORDER BY league_id, gameweek;

-- 2c) Summary: distinct league_ids across BOTH tables (union)
SELECT league_id, 'cache' AS source FROM public.league_cache
UNION
SELECT league_id, 'history' AS source FROM public.league_history
ORDER BY league_id;