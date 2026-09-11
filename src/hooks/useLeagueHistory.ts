import { useQuery } from "@tanstack/react-query";
import type { FplDataResponse } from "./useFplData";

const HISTORY_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/functions/v1/get-league-history`;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface LeagueHistoryItem {
  gameweek: number;
  created_at: string;
}

const authHeaders = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
};

const fetchHistoryList = async (
  leagueCode: string,
  signal?: AbortSignal
): Promise<LeagueHistoryItem[]> => {
  const url = new URL(HISTORY_URL);
  url.searchParams.set("leagueId", leagueCode);

  const res = await fetch(url.toString(), {
    method: "GET",
    signal,
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);

  const data = await res.json();
  return data?.gameweeks ?? [];
};

const fetchSnapshot = async (
  leagueCode: string,
  gameweek: number,
  signal?: AbortSignal
): Promise<FplDataResponse | null> => {
  const url = new URL(HISTORY_URL);
  url.searchParams.set("leagueId", leagueCode);
  url.searchParams.set("gameweek", String(gameweek));

  const res = await fetch(url.toString(), {
    method: "GET",
    signal,
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);

  const data = await res.json();
  return data?.snapshot ?? null;
};

/**
 * List archived gameweeks for a league.
 */
export const useLeagueHistory = (leagueCode: string | null) => {
  return useQuery({
    queryKey: ["league-history", leagueCode],
    queryFn: ({ signal }) => fetchHistoryList(leagueCode!, signal),
    enabled: Boolean(leagueCode),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch the standings snapshot for a specific archived gameweek.
 */
export const useLeagueSnapshot = (
  leagueCode: string | null,
  gameweek: number | null
) => {
  return useQuery({
    queryKey: ["league-history", leagueCode, gameweek],
    queryFn: ({ signal }) => fetchSnapshot(leagueCode!, gameweek!, signal),
    enabled: Boolean(leagueCode && gameweek),
    staleTime: 5 * 60 * 1000,
  });
};

/** One manager's league rank at each archived gameweek. */
export interface RankHistorySeries {
  entry: number;
  player_name: string;
  entry_name: string;
  points: { gameweek: number; rank: number }[];
}

/**
 * Pull every archived snapshot for a league and reshape them into one
 * rank-per-gameweek series per manager, for the rank-over-time chart.
 *
 * The archive holds at most one row per gameweek (enforced by a unique index),
 * so this is bounded by the number of completed gameweeks — 38 at most. The
 * per-gameweek reads run in parallel, and one failing is skipped rather than
 * blanking the whole chart.
 */
const fetchRankHistory = async (
  leagueCode: string,
  signal?: AbortSignal
): Promise<RankHistorySeries[]> => {
  const list = await fetchHistoryList(leagueCode, signal);
  const gameweeks = list.map((item) => item.gameweek).sort((a, b) => a - b);
  if (!gameweeks.length) return [];

  const snapshots = await Promise.all(
    gameweeks.map((gw) =>
      fetchSnapshot(leagueCode, gw, signal).catch(() => null)
    )
  );

  const byEntry = new Map<number, RankHistorySeries>();

  gameweeks.forEach((gameweek, index) => {
    const snapshot = snapshots[index];
    if (!snapshot?.leagueData?.length) return;

    snapshot.leagueData.forEach((manager) => {
      let series = byEntry.get(manager.entry);
      if (!series) {
        series = {
          entry: manager.entry,
          player_name: manager.player_name,
          entry_name: manager.entry_name,
          points: [],
        };
        byEntry.set(manager.entry, series);
      }
      series.points.push({ gameweek, rank: manager.rank });
    });
  });

  return [...byEntry.values()];
};

/**
 * Rank-over-gameweek series for a league, built from archived snapshots.
 */
export const useRankHistory = (leagueCode: string | null) => {
  return useQuery({
    queryKey: ["rank-history", leagueCode],
    queryFn: ({ signal }) => fetchRankHistory(leagueCode!, signal),
    enabled: Boolean(leagueCode),
    staleTime: 5 * 60 * 1000,
  });
};
