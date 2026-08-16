import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface Chip {
  name: string;
  time: string;
  event: number;
}

export interface TransferData {
  gameweek: number;
  transfers_made: number;
  transfer_cost: number;
  points: number;
}

export interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
  chips: Chip[];
  transfers: TransferData[];
  last_rank?: number | null;
}

export interface GameweekChampion {
  gameweek: number;
  champions: {
    player_name: string;
    entry_name: string;
    points: number;
  }[];
}

export interface FplDataResponse {
  leagueData: Manager[];
  gameweekChampions: GameweekChampion[];
  currentGameweek: number;
  leagueName?: string;
  isLive?: boolean;
  fetchedAt?: string;
}

export interface FetchParams {
  leagueCode: string;
  startGW: number;
  endGW: number;
}

// Query key factory for type-safe cache management
export const fplQueryKeys = {
  all: ["fpl"] as const,
  league: (code: string, start: number, end: number) =>
    [...fplQueryKeys.all, code, start, end] as const,
};

// The league data endpoint is called over GET so that the service worker can
// apply stale-while-revalidate caching (Workbox only caches GET requests).
const FETCH_LEAGUE_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/functions/v1/fetch-league-data`;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fetch function with AbortController support
const fetchFplData = async (
  params: FetchParams,
  signal?: AbortSignal
): Promise<FplDataResponse> => {
  const url = new URL(FETCH_LEAGUE_URL);
  url.searchParams.set("leagueCode", params.leagueCode);
  url.searchParams.set("startGW", String(params.startGW));
  url.searchParams.set("endGW", String(params.endGW));

  const response = await fetch(url.toString(), {
    method: "GET",
    signal,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body; keep the status message
    }
    throw new Error(message);
  }

  const data = (await response.json()) as FplDataResponse;
  if (!data?.leagueData) throw new Error("No data received");
  return data;
};

// CSV download function
const downloadCsv = async (
  params: FetchParams,
  signal?: AbortSignal
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("generate-excel", {
    body: params,
    signal,
  });

  if (error) throw error;
  if (!data?.fileUrl) throw new Error("No file URL received");

  return data.fileUrl as string;
};

/**
 * Optimized hook for fetching FPL league data
 * Features:
 * - Stale-while-revalidate caching (5 min stale, 30 min cache)
 * - Automatic background refetching on window focus
 * - Request deduplication
 * - Error retry with exponential backoff
 * - Type-safe cache keys
 */
export const useFplData = (params: FetchParams | null) => {
  const { leagueCode, startGW, endGW } = params || {};

  return useQuery({
    queryKey: params
      ? fplQueryKeys.league(leagueCode, startGW, endGW)
      : fplQueryKeys.all,
    queryFn: ({ signal }) =>
      fetchFplData(
        { leagueCode, startGW, endGW },
        signal
      ),
    enabled: Boolean(leagueCode && startGW && endGW),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Live gameweek tracking: poll every 60s while a gameweek is live.
    // The query is considered unfocused (and won't poll) when the tab is hidden,
    // because focusManager is wired to the Page Visibility API in App.tsx.
    refetchInterval: (query) =>
      query.state.data?.isLive ? 60 * 1000 : false,
    refetchIntervalInBackground: false,
  });
};

/**
 * Hook to get current gameweek from data
 */
export const useCurrentGameweek = (leagueData: Manager[] | null): number => {
  return useMemo(() => {
    if (!leagueData?.length) return 0;
    // Find the highest gameweek key across all managers as fallback
    let maxGW = 0;
    leagueData.forEach(manager => {
      Object.keys(manager.gameweek_points).forEach(key => {
        const gw = parseInt(key, 10);
        if (!isNaN(gw) && gw > maxGW) maxGW = gw;
      });
    });
    return maxGW > 0 ? maxGW : 0;
  }, [leagueData]);
};

/**
 * Hook for manually triggering data fetch
 * Use this for explicit user actions (button clicks)
 */
export const useFplDataMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchFplData,
    onSuccess: (data, variables) => {
      // Update cache with fresh data
      queryClient.setQueryData(
        fplQueryKeys.league(
          variables.leagueCode,
          variables.startGW,
          variables.endGW
        ),
        data
      );
    },
  });
};

/**
 * Hook for CSV downloads
 */
export const useFplDownload = () => {
  return useMutation({
    mutationFn: downloadCsv,
  });
};

/**
 * Prefetch hook for optimistic data loading
 * Call this when user is likely to fetch (e.g., on input focus)
 */
export const usePrefetchFplData = () => {
  const queryClient = useQueryClient();

  return (params: FetchParams) => {
    queryClient.prefetchQuery({
      queryKey: fplQueryKeys.league(
        params.leagueCode,
        params.startGW,
        params.endGW
      ),
      queryFn: () => fetchFplData(params),
      staleTime: 5 * 60 * 1000,
    });
  };
};
