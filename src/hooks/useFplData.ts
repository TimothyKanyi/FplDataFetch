import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// Fetch function with AbortController support
const fetchFplData = async (
  params: FetchParams,
  signal?: AbortSignal
): Promise<FplDataResponse> => {
  const { data, error } = await supabase.functions.invoke("fetch-league-data", {
    body: params,
    signal,
  });

  if (error) throw error;
  if (!data) throw new Error("No data received");

  return data as FplDataResponse;
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
    enabled: !!params,
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache even if unused
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
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
