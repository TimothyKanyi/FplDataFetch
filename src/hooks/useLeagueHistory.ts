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
