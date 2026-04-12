import { useMemo, useCallback } from "react";
import type { Manager, GameweekChampion } from "./useFplData";

/**
 * AI-Optimized Data Context Hook
 * 
 * Purpose: Selectively gathers ONLY the essential summary data for LLM consumption
 * to stay within token limits while providing rich context about the league.
 * 
 * Design Principles:
 * - Token-efficient: No raw player arrays, only summaries
 * - Structured: JSON-ready format for function calling
 * - Scoped: Only includes data relevant to current league view
 * - Memoized: Prevents unnecessary recalculations
 */

export interface AIScopedContext {
  // League metadata
  meta: {
    name: string;
    managerCount: number;
    currentGameweek: number;
    totalGameweeks: number;
    lastUpdated: string;
  };

  // Standings summary (top 5 only to save tokens)
  standings: {
    rank: number;
    name: string;
    team: string;
    total: number;
    pointsBehindLeader: number;
  }[];

  // League averages for benchmarking
  averages: {
    leagueAverage: number;
    topScore: number;
    lowestScore: number;
    averagePerGW: number;
  };

  // Key storylines (pre-computed insights)
  storylines: {
    type: string;
    title: string;
    manager: string;
    description: string;
  }[];

  // Performance metrics
  performance: {
    mostConsistent: string;
    biggestClimber: string;
    highestSingleGW: { name: string; points: number; gw: number };
    transferHitKing: { name: string; pointsLost: number };
  };

  // Recent activity (last 3 gameweeks)
  recent: {
    gameweek: number;
    topScorer: string;
    average: number;
  }[];
}

/**
 * Token estimate: ~500-800 tokens for a typical league
 * Well within standard LLM context windows (4K-128K)
 */
export const useAIGlobalContext = (
  leagueData: Manager[] | null,
  gameweekChampions: GameweekChampion[] | null,
  leagueName: string = "FPL League"
): AIScopedContext | null => {
  return useMemo(() => {
    if (!leagueData?.length) return null;

    const gameweeks = Object.keys(leagueData[0]?.gameweek_points || {}).sort(
      (a, b) => Number(a) - Number(b)
    );
    const currentGW = gameweeks.length;

    // 1. STANDINGS (Top 5 only to save tokens)
    const leader = leagueData[0];
    const standings = leagueData.slice(0, 5).map((manager) => ({
      rank: manager.rank,
      name: manager.player_name,
      team: manager.entry_name,
      total: manager.total,
      pointsBehindLeader: leader.total - manager.total,
    }));

    // 2. LEAGUE AVERAGES
    const scores = leagueData.map((m) => m.total);
    const leagueAverage = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
    const topScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    // Calculate per-GW average
    const avgPerGW = gameweeks.map((gw) => {
      const gwTotal = leagueData.reduce(
        (sum, m) => sum + (m.gameweek_points[gw] || 0),
        0
      );
      return gwTotal / leagueData.length;
    });
    const averagePerGW = Math.round(
      avgPerGW.reduce((a, b) => a + b, 0) / avgPerGW.length
    );

    // 3. PRE-COMPUTED STORYLINES (token-efficient summaries)
    const storylines: AIScopedContext["storylines"] = [];

    // Biggest climber calculation
    const latestGW = gameweeks[currentGW - 1];
    const previousGW = gameweeks[currentGW - 2];
    if (previousGW && latestGW) {
      const previousPoints = new Map<number, number>();
      leagueData.forEach((manager) => {
        let cumulative = 0;
        for (let i = 0; i < gameweeks.indexOf(previousGW) + 1; i++) {
          cumulative += manager.gameweek_points[gameweeks[i]] || 0;
        }
        previousPoints.set(manager.entry, cumulative);
      });

      const sortedByPrevious = Array.from(previousPoints.entries()).sort(
        ([, a], [, b]) => b - a
      );
      const previousRanks = new Map<number, number>();
      sortedByPrevious.forEach(([entry], index) => {
        previousRanks.set(entry, index + 1);
      });

      let bestClimb = { name: "", climb: 0 };
      leagueData.forEach((manager) => {
        const prevRank = previousRanks.get(manager.entry) || manager.rank;
        const climb = prevRank - manager.rank;
        if (climb > bestClimb.climb) {
          bestClimb = { name: manager.player_name, climb };
        }
      });

      if (bestClimb.climb > 0) {
        storylines.push({
          type: "climber",
          title: "Biggest Climber",
          manager: bestClimb.name,
          description: `Jumped ${bestClimb.climb} positions this gameweek`,
        });
      }
    }

    // Most consistent
    const consistencyScores = leagueData.map((manager) => {
      const points = Object.values(manager.gameweek_points);
      const avg = points.reduce((a, b) => a + b, 0) / points.length;
      const variance =
        points.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / points.length;
      return { name: manager.player_name, stdDev: Math.sqrt(variance) };
    }).sort((a, b) => a.stdDev - b.stdDev);

    if (consistencyScores.length > 0) {
      storylines.push({
        type: "consistent",
        title: "Mr. Consistent",
        manager: consistencyScores[0].name,
        description: "Lowest point variance across all gameweeks",
      });
    }

    // Highest single GW
    let highestGW = { name: "", points: 0, gw: 0 };
    leagueData.forEach((manager) => {
      Object.entries(manager.gameweek_points).forEach(([gw, points]) => {
        if (points > highestGW.points) {
          highestGW = { name: manager.player_name, points, gw: Number(gw) };
        }
      });
    });

    if (highestGW.points > 0) {
      storylines.push({
        type: "record",
        title: "Highest Single GW",
        manager: highestGW.name,
        description: `Scored ${highestGW.points} points in GW${highestGW.gw}`,
      });
    }

    // 4. PERFORMANCE METRICS
    const transferHitters = leagueData
      .map((manager) => ({
        name: manager.player_name,
        totalCost: manager.transfers.reduce((sum, t) => sum + t.transfer_cost, 0),
      }))
      .filter((t) => t.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost);

    const performance = {
      mostConsistent: consistencyScores[0]?.name || "N/A",
      biggestClimber: storylines.find((s) => s.type === "climber")?.manager || "N/A",
      highestSingleGW: {
        name: highestGW.name || "N/A",
        points: highestGW.points,
        gw: highestGW.gw,
      },
      transferHitKing: {
        name: transferHitters[0]?.name || "N/A",
        pointsLost: transferHitters[0]?.totalCost || 0,
      },
    };

    // 5. RECENT ACTIVITY (Last 3 gameweeks)
    const recent = gameweeks.slice(-3).map((gw) => {
      const gwChampion = gameweekChampions?.find((c) => c.gameweek === Number(gw));
      const gwTotal = leagueData.reduce(
        (sum, m) => sum + (m.gameweek_points[gw] || 0),
        0
      );
      return {
        gameweek: Number(gw),
        topScorer: gwChampion?.champions[0]?.player_name || "Unknown",
        average: Math.round(gwTotal / leagueData.length),
      };
    });

    return {
      meta: {
        name: leagueName,
        managerCount: leagueData.length,
        currentGameweek: currentGW,
        totalGameweeks: 38,
        lastUpdated: new Date().toISOString(),
      },
      standings,
      averages: {
        leagueAverage,
        topScore,
        lowestScore,
        averagePerGW,
      },
      storylines,
      performance,
      recent,
    };
  }, [leagueData, gameweekChampions, leagueName]);
};

/**
 * Hook to generate a prompt-ready text summary for LLM consumption
 * Alternative to structured JSON for simpler use cases
 */
export const useAIContextString = (
  leagueData: Manager[] | null,
  gameweekChampions: GameweekChampion[] | null,
  leagueName: string = "FPL League"
): string => {
  const context = useAIGlobalContext(leagueData, gameweekChampions, leagueName);

  return useMemo(() => {
    if (!context) return "";

    return `
## ${context.meta.name} - AI Context Summary

**League Status:** GW${context.meta.currentGameweek}/38 | ${context.meta.managerCount} managers

**Top Standings:**
${context.standings
  .map(
    (s) =>
      `${s.rank}. ${s.name} (${s.team}) - ${s.total} pts${
        s.pointsBehindLeader > 0 ? ` (-${s.pointsBehindLeader})` : " (Leader)"
      }`
  )
  .join("\n")}

**League Averages:**
- League Average: ${context.averages.leagueAverage} pts
- Per-GW Average: ${context.averages.averagePerGW} pts
- Range: ${context.averages.lowestScore} - ${context.averages.topScore}

**Key Storylines:**
${context.storylines.map((s) => `- ${s.title}: ${s.manager} - ${s.description}`).join("\n")}

**Recent Activity (Last 3 GWs):**
${context.recent
  .map((r) => `- GW${r.gameweek}: Top ${r.topScorer} (${r.average} avg)`)
  .join("\n")}

**Notable Performers:**
- Most Consistent: ${context.performance.mostConsistent}
- Highest Single GW: ${context.performance.highestSingleGW.name} (${context.performance.highestSingleGW.points} pts in GW${context.performance.highestSingleGW.gw})
- Transfer Hit King: ${context.performance.transferHitKing.name} (-${context.performance.transferHitKing.pointsLost} pts)
    `.trim();
  }, [context]);
};

/**
 * Hook to get AI context as a compact JSON string
 * Useful for storing in localStorage or sending to API
 */
export const useAIContextJSON = (
  leagueData: Manager[] | null,
  gameweekChampions: GameweekChampion[] | null,
  leagueName: string = "FPL League"
): string => {
  const context = useAIGlobalContext(leagueData, gameweekChampions, leagueName);

  return useMemo(() => {
    if (!context) return "{}";
    return JSON.stringify(context);
  }, [context]);
};

/**
 * Estimated token count for the context
 * GPT-4/Claude token estimation (~4 chars per token)
 */
export const useAIContextTokenEstimate = (
  leagueData: Manager[] | null
): number => {
  return useMemo(() => {
    if (!leagueData?.length) return 0;
    // Base + per-manager estimate
    return 150 + leagueData.length * 25;
  }, [leagueData]);
};
