import { useMemo, useCallback } from "react";
import type { Manager, GameweekChampion, TransferData } from "./useFplData";

// Memoized computation hooks for FPL data
// These prevent expensive recalculations on every render

/**
 * Hook to extract and memoize gameweek list
 * Only recalculates when leagueData reference changes
 */
export const useGameweeks = (leagueData: Manager[] | null): string[] => {
  return useMemo(() => {
    if (!leagueData?.length) return [];
    return Object.keys(leagueData[0].gameweek_points).sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [leagueData]);
};

/**
 * Hook to calculate max points per gameweek (for highlighting)
 * Memoized to prevent O(n*m) calculation on every render
 */
export const useMaxPointsMap = (
  leagueData: Manager[] | null
): Map<string, number> => {
  return useMemo(() => {
    if (!leagueData?.length) return new Map();

    const gameweeks = Object.keys(leagueData[0].gameweek_points);
    const maxMap = new Map<string, number>();

    gameweeks.forEach((gw) => {
      const max = Math.max(
        ...leagueData.map((m) => m.gameweek_points[gw] || 0)
      );
      maxMap.set(gw, max);
    });

    return maxMap;
  }, [leagueData]);
};

/**
 * Hook to get callback for checking if points are highest for gameweek
 */
export const useIsHighestPoints = (
  leagueData: Manager[] | null
): ((gw: string, points: number) => boolean) => {
  const maxMap = useMaxPointsMap(leagueData);

  return useCallback(
    (gw: string, points: number): boolean => {
      const max = maxMap.get(gw);
      return max !== undefined && points === max && points > 0;
    },
    [maxMap]
  );
};

interface ChampionStat {
  name: string;
  wins: number;
}

/**
 * Hook to calculate champion frequency statistics
 * Memoized O(n*m) calculation
 */
export const useChampionStats = (
  gameweekChampions: GameweekChampion[] | null
): ChampionStat[] => {
  return useMemo(() => {
    if (!gameweekChampions?.length) return [];

    const counts: Record<string, number> = {};

    gameweekChampions.forEach((gw) => {
      gw.champions.forEach((champion) => {
        counts[champion.player_name] = (counts[champion.player_name] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, wins]) => ({ name, wins }));
  }, [gameweekChampions]);
};

interface ManagerConsistency {
  entry: number;
  player_name: string;
  entry_name: string;
  average: string;
  consistency: string;
}

/**
 * Hook to calculate manager consistency scores
 * Uses standard deviation for consistency metric
 */
export const useManagerConsistency = (
  leagueData: Manager[] | null
): ManagerConsistency[] => {
  return useMemo(() => {
    if (!leagueData?.length) return [];

    return leagueData
      .map((manager) => {
        const points = Object.values(manager.gameweek_points);
        if (!points.length) {
          return {
            entry: manager.entry,
            player_name: manager.player_name,
            entry_name: manager.entry_name,
            average: "0",
            consistency: "0",
          };
        }

        const avg = points.reduce((a, b) => a + b, 0) / points.length;
        const variance =
          points.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) /
          points.length;
        const stdDev = Math.sqrt(variance);

        return {
          entry: manager.entry,
          player_name: manager.player_name,
          entry_name: manager.entry_name,
          average: avg.toFixed(1),
          consistency: (100 - stdDev).toFixed(1),
        };
      })
      .sort((a, b) => Number(b.consistency) - Number(a.consistency));
  }, [leagueData]);
};

interface AvgPointsPerGW {
  gameweek: string;
  average: string;
}

/**
 * Hook to calculate average points per gameweek
 */
export const useAvgPointsPerGW = (
  leagueData: Manager[] | null,
  gameweeks: string[]
): AvgPointsPerGW[] => {
  return useMemo(() => {
    if (!leagueData?.length) return [];

    return gameweeks.map((gw) => {
      const total = leagueData.reduce(
        (sum, m) => sum + (m.gameweek_points[gw] || 0),
        0
      );
      return {
        gameweek: `GW${gw}`,
        average: (total / leagueData.length).toFixed(1),
      };
    });
  }, [leagueData, gameweeks]);
};

interface ManagerStats {
  entry: number;
  player_name: string;
  entry_name: string;
  rank: number;
  total: number;
  average: string;
  highest: number;
  lowest: number;
  totalTransfers: number;
  totalTransferCost: number;
}

/**
 * Hook to compute comprehensive manager statistics
 */
export const useManagerStats = (
  leagueData: Manager[] | null
): ManagerStats[] => {
  return useMemo(() => {
    if (!leagueData?.length) return [];

    return leagueData.map((manager) => {
      const points = Object.values(manager.gameweek_points);
      const average = points.length
        ? (points.reduce((a, b) => a + b, 0) / points.length).toFixed(1)
        : "0";
      const highest = points.length ? Math.max(...points) : 0;
      const lowest = points.length ? Math.min(...points) : 0;

      const totalTransfers = manager.transfers.reduce(
        (sum, t) => sum + t.transfers_made,
        0
      );
      const totalTransferCost = manager.transfers.reduce(
        (sum, t) => sum + t.transfer_cost,
        0
      );

      return {
        entry: manager.entry,
        player_name: manager.player_name,
        entry_name: manager.entry_name,
        rank: manager.rank,
        total: manager.total,
        average,
        highest,
        lowest,
        totalTransfers,
        totalTransferCost,
      };
    });
  }, [leagueData]);
};

/**
 * Hook to get a specific manager by entry ID (memoized lookup)
 */
export const useManagerById = (
  leagueData: Manager[] | null,
  entryId: number | null
): Manager | null => {
  return useMemo(() => {
    if (!leagueData?.length || !entryId) return null;
    return leagueData.find((m) => m.entry === entryId) || null;
  }, [leagueData, entryId]);
};

/**
 * Hook to compute chart data for performance visualization
 */
export const useChartData = (
  leagueData: Manager[] | null,
  topN: number = 6
) => {
  return useMemo(() => {
    if (!leagueData?.length) return { gameweeks: [], data: [], managers: [] };

    const topManagers = leagueData.slice(0, topN);
    const gameweeks = Object.keys(topManagers[0].gameweek_points).sort(
      (a, b) => Number(a) - Number(b)
    );

    const data = gameweeks.map((gw) => {
      const point: Record<string, number | string> = { gameweek: `GW${gw}` };
      topManagers.forEach((manager) => {
        point[manager.player_name] = manager.gameweek_points[gw] || 0;
      });
      return point;
    });

    return { gameweeks, data, managers: topManagers };
  }, [leagueData, topN]);
};
