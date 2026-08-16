-- Migration: Create league_cache and league_history tables

CREATE TABLE IF NOT EXISTS public.league_cache (
  league_id text NOT NULL,
  start_gw integer NOT NULL,
  end_gw integer NOT NULL,
  payload jsonb,
  fetched_at timestamptz,
  last_queried_at timestamptz,
  PRIMARY KEY (league_id, start_gw, end_gw)
);

CREATE INDEX IF NOT EXISTS idx_league_cache_last_queried_at ON public.league_cache (last_queried_at DESC);

CREATE TABLE IF NOT EXISTS public.league_history (
  id bigserial PRIMARY KEY,
  league_id text NOT NULL,
  gameweek integer NOT NULL,
  standings_snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_history_league_gameweek ON public.league_history (league_id, gameweek);
