-- ============================================================
-- STEP 4: DELETE CONFIRMED TEST-SEED ROWS
-- Run in: Supabase Dashboard -> SQL Editor
-- DESTRUCTIVE - review before executing.
--
-- Deletes the seeded fake payloads only:
--   1) league_cache: league 123456, GW1-38, "Test League"
--      (fetched_at in the future: 2027-08-16) -> TEST SEED
--   2) league_history: league 123456, GW2, "Test League"
--      (created 2026-08-15) -> TEST SEED
--
-- The other 123456 rows (GW1-2 and GW18-38, "Guttene", empty)
-- are real-league pre-season caches and are handled in Step 5.
-- demo-league-001 is NEVER matched by these filters.
-- ============================================================

-- 4a) Delete the test-seed league_cache row (RETURNING shows what was deleted)
DELETE FROM public.league_cache
WHERE league_id = '123456'
  AND start_gw = 1
  AND end_gw = 38
RETURNING league_id, start_gw, end_gw, fetched_at, payload->>'leagueName' AS league_name;

-- 4b) Delete the test-seed league_history row
DELETE FROM public.league_history
WHERE league_id = '123456'
  AND gameweek = 2
RETURNING league_id, gameweek, created_at, standings_snapshot->>'leagueName' AS league_name;

-- 4c) Verification: confirm the test-seed rows are gone
-- (league_cache GW1-2 and GW18-38 remain - those are Step 5 targets)
SELECT 'league_cache' AS tbl, league_id, start_gw::text AS gw_from, end_gw::text AS gw_to
FROM public.league_cache
WHERE league_id = '123456'

UNION ALL

SELECT 'league_history', league_id, gameweek::text, '0'
FROM public.league_history
WHERE league_id = '123456';