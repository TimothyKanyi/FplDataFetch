-- Migration: enforce one snapshot per league per gameweek in league_history.
-- This makes the pre-warm cron's "once per completed gameweek" writes idempotent
-- even if two runs race between the SELECT-exists check and the INSERT.

-- Remove the non-unique index so we can replace it with a unique one.
DROP INDEX IF EXISTS public.idx_league_history_league_gameweek;

-- Deduplicate any existing rows (keep the earliest row for each league+gameweek).
DELETE FROM public.league_history a
USING public.league_history b
WHERE a.id > b.id
  AND a.league_id = b.league_id
  AND a.gameweek = b.gameweek;

-- Unique index enforces idempotent snapshots at the database level.
CREATE UNIQUE INDEX idx_league_history_league_gameweek
ON public.league_history (league_id, gameweek);
