import { memo, lazy, Suspense, useCallback } from "react";
import { List } from "react-window";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { TransfersData } from "./TransfersData";
import { ManagerComparison } from "./ManagerComparison";
import { ChipsUsed } from "./ChipsUsed";
import { AnimatedTabs } from "./AnimatedTabs";
import { EnhancedSkeleton } from "./EnhancedSkeleton";
import { ErrorBoundary } from "./ErrorBoundary";
import type { Manager, GameweekChampion } from "@/hooks/useFplData";
import { useGameweeks, useIsHighestPoints } from "@/hooks/useFplComputed";

// Lazy-load the Statistics tab so recharts (a heavy dependency) is split out of
// the initial/shared bundle and only fetched when the user opens the Stats tab.
// Statistics is a named export, so map it to the default export React.lazy expects.
const Statistics = lazy(() =>
  import("./Statistics").then((module) => ({ default: module.Statistics }))
);

interface DataDisplayProps {
  leagueData: Manager[] | null;
  gameweekChampions: GameweekChampion[] | null;
  currentGameweek?: number;
  isLive?: boolean;
  fetchedAt?: string;
}

/**
 * Compact rank-movement indicator: ▲ green if moved up, ▼ red if moved down,
 * and a neutral dash if unchanged or `last_rank` is unavailable.
 */
const RankMovement = memo(({ manager }: { manager: Manager }) => {
  const last = manager.last_rank;
  if (last == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const delta = last - manager.rank;
  if (delta > 0) {
    return <span className="font-semibold text-emerald-600">▲{delta}</span>;
  }
  if (delta < 0) {
    return <span className="font-semibold text-red-600">▼{Math.abs(delta)}</span>;
  }
  return <span className="text-muted-foreground">—</span>;
});

// Chip abbreviations + badge colors for the standings "Chips" column.
const CHIP_ABBREVIATIONS: Record<string, string> = {
  wildcard: "WC",
  bboost: "BB",
  "3xc": "TC",
  freehit: "FH",
};

const CHIP_BADGE_COLORS: Record<string, string> = {
  WC: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  BB: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  TC: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  FH: "bg-green-500/15 text-green-700 dark:text-green-300",
};

// Show chips played in the current + previous two gameweeks.
const getRecentChipBadges = (
  manager: Manager,
  currentGameweek?: number
): string[] => {
  const windowEnd =
    currentGameweek && currentGameweek > 0
      ? currentGameweek
      : Number.MAX_SAFE_INTEGER;
  const windowStart =
    currentGameweek && currentGameweek > 2 ? currentGameweek - 2 : 1;

  return (manager.chips || [])
    .filter((chip) => chip.event >= windowStart && chip.event <= windowEnd)
    .map((chip) => CHIP_ABBREVIATIONS[chip.name])
    .filter((abbr): abbr is string => Boolean(abbr));
};

const ChipBadges = memo(
  ({
    manager,
    currentGameweek,
  }: {
    manager: Manager;
    currentGameweek?: number;
  }) => {
    const badges = getRecentChipBadges(manager, currentGameweek);
    if (!badges.length) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {badges.map((abbr, i) => (
          <span
            key={`${abbr}-${i}`}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              CHIP_BADGE_COLORS[abbr]
            }`}
          >
            {abbr}
          </span>
        ))}
      </div>
    );
  }
);

// Memoized table row component to prevent re-render of all rows
const ManagerTableRow = memo(
  ({
    manager,
    gameweeks,
    isHighestPoints,
    currentGameweek,
  }: {
    manager: Manager;
    gameweeks: string[];
    isHighestPoints: (gw: string, points: number) => boolean;
    currentGameweek?: number;
  }) => (
    <TableRow>
      <TableCell className="font-medium">{manager.rank}</TableCell>
      <TableCell className="w-[64px] text-center">
        <RankMovement manager={manager} />
      </TableCell>
      <TableCell>{manager.player_name}</TableCell>
      <TableCell>{manager.entry_name}</TableCell>
      <TableCell className="text-right font-bold">{manager.total}</TableCell>
      <TableCell>
        <ChipBadges manager={manager} currentGameweek={currentGameweek} />
      </TableCell>
      {gameweeks.map((gw) => {
        const points = manager.gameweek_points[gw] || 0;
        const isHighest = isHighestPoints(gw, points);
        return (
          <TableCell
            key={gw}
            className={`text-right ${isHighest ? "font-bold text-accent bg-accent/10" : ""}`}
          >
            {points}
          </TableCell>
        );
      })}
    </TableRow>
  )
);

// Column width constants shared by the header and virtualized rows so they stay aligned.
const RANK_W = 80;
const MOVEMENT_W = 56;
const TOTAL_W = 80;
const CHIPS_W = 120;
const GW_W = 64;
const ROW_HEIGHT = 40;
const LIST_MAX_HEIGHT = 440;

/**
 * Virtualized standings body for large leagues (> 50 managers).
 * Renders only visible rows via react-window; the header stays fixed above it.
 */
const VirtualizedManagerTable = memo(
  ({
    leagueData,
    gameweeks,
    isHighestPoints,
    currentGameweek,
  }: {
    leagueData: Manager[];
    gameweeks: string[];
    isHighestPoints: (gw: string, points: number) => boolean;
    currentGameweek?: number;
  }) => {
    const headerClasses =
      "bg-card text-muted-foreground text-sm font-medium border-b border-border";

    const Row = useCallback(
      ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const manager = leagueData[index];
        return (
          <div
            style={style}
            className="flex items-center border-b border-border/60 text-sm hover:bg-muted/30"
          >
            <div style={{ width: RANK_W }} className="shrink-0 px-4 py-2 font-medium">
              {manager.rank}
            </div>
            <div style={{ width: MOVEMENT_W }} className="shrink-0 px-1 py-2 text-center">
              <RankMovement manager={manager} />
            </div>
            <div className="flex-1 min-w-[140px] px-4 py-2 truncate">
              {manager.player_name}
            </div>
            <div className="flex-1 min-w-[140px] px-4 py-2 text-muted-foreground truncate">
              {manager.entry_name}
            </div>
            <div style={{ width: TOTAL_W }} className="shrink-0 px-4 py-2 text-right font-bold">
              {manager.total}
            </div>
            <div style={{ width: CHIPS_W }} className="shrink-0 px-2 py-2">
              <ChipBadges manager={manager} currentGameweek={currentGameweek} />
            </div>
            {gameweeks.map((gw) => {
              const points = manager.gameweek_points[gw] || 0;
              const isHighest = isHighestPoints(gw, points);
              return (
                <div
                  key={gw}
                  style={{ width: GW_W }}
                  className={`shrink-0 px-2 py-2 text-right ${
                    isHighest ? "font-bold text-accent bg-accent/10" : ""
                  }`}
                >
                  {points}
                </div>
              );
            })}
          </div>
        );
      },
      [leagueData, gameweeks, isHighestPoints, currentGameweek]
    );

    return (
      <div className="min-w-[900px]">
        {/* Virtualized header row (always visible above the scrolling body) */}
        <div className={`flex items-center ${headerClasses}`}>
          <div style={{ width: RANK_W }} className="shrink-0 px-4 py-3">
            Rank
          </div>
          <div style={{ width: MOVEMENT_W }} className="shrink-0 px-1 py-3 text-center">
            ±
          </div>
          <div className="flex-1 min-w-[140px] px-4 py-3">Manager</div>
          <div className="flex-1 min-w-[140px] px-4 py-3">Team Name</div>
          <div style={{ width: TOTAL_W }} className="shrink-0 px-4 py-3 text-right">
            Total
          </div>
          <div style={{ width: CHIPS_W }} className="shrink-0 px-2 py-3">
            Chips
          </div>
          {gameweeks.map((gw) => (
            <div
              key={gw}
              style={{ width: GW_W }}
              className="shrink-0 px-2 py-3 text-right whitespace-nowrap"
            >
              GW{gw}
            </div>
          ))}
        </div>

        <List
          rowComponent={Row}
          rowCount={leagueData.length}
          rowHeight={ROW_HEIGHT}
          rowProps={{}}
          rowKey={(index) => leagueData[index]?.entry ?? index}
          style={{
            height: Math.min(leagueData.length * ROW_HEIGHT, LIST_MAX_HEIGHT),
            width: "100%",
          }}
        />
      </div>
    );
  }
);

export const DataDisplay = memo(({ leagueData, gameweekChampions, currentGameweek, isLive, fetchedAt }: DataDisplayProps) => {
  // Hooks must be called before any early return
  const gameweeks = useGameweeks(leagueData);
  const isHighestPoints = useIsHighestPoints(leagueData);

  if (!leagueData || !gameweekChampions) return null;

  return (
    <div className="space-y-6">
      {/* Animated Tabs with all content */}
      <AnimatedTabs
        defaultTab="standings"
        children={{
          standings: (
            <ErrorBoundary name="standings">
              <>
              {/* League Standings */}
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>League Standings</CardTitle>
                      <CardDescription>
                        Overall rankings with gameweek-by-gameweek points
                      </CardDescription>
                    </div>
                    {fetchedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isLive && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-600">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                            </span>
                            LIVE
                          </span>
                        )}
                        <span>
                          Updated{" "}
                          {new Date(fetchedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {leagueData.length > 50 ? (
                    <div className="w-full rounded-md border overflow-x-auto relative">
                      <VirtualizedManagerTable
                        leagueData={leagueData}
                        gameweeks={gameweeks}
                        isHighestPoints={isHighestPoints}
                        currentGameweek={currentGameweek}
                      />
                    </div>
                  ) : (
                    <div className="w-full rounded-md border overflow-x-auto overflow-y-auto max-h-[500px] relative">
                      <Table className="min-w-[800px]">
                        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="sticky top-0 bg-card z-10 w-[80px]">Rank</TableHead>
                            <TableHead className="sticky top-0 bg-card z-10 w-[64px] text-center">±</TableHead>
                            <TableHead className="sticky top-0 bg-card z-10">Manager</TableHead>
                            <TableHead className="sticky top-0 bg-card z-10">Team Name</TableHead>
                            <TableHead className="sticky top-0 bg-card z-10 text-right">Total</TableHead>
                            <TableHead className="sticky top-0 bg-card z-10 w-[130px]">Chips</TableHead>
                            {gameweeks.map((gw) => (
                              <TableHead key={gw} className="sticky top-0 bg-card z-10 text-right whitespace-nowrap">
                                GW{gw}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leagueData.map((manager) => (
                            <ManagerTableRow
                              key={manager.entry}
                              manager={manager}
                              gameweeks={gameweeks}
                              isHighestPoints={isHighestPoints}
                              currentGameweek={currentGameweek}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gameweek Champions */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" />
                    Gameweek Champions
                  </CardTitle>
                  <CardDescription>
                    Top scorer(s) for each gameweek
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full rounded-md border overflow-x-auto overflow-y-auto max-h-[400px] relative">
                    <Table className="min-w-[600px]">
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="sticky top-0 bg-card z-10 w-[100px]">Gameweek</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">Manager(s)</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">Team Name(s)</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10 text-right">Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gameweekChampions.map((gw) => (
                          <TableRow key={gw.gameweek}>
                            <TableCell className="font-medium">GW {gw.gameweek}</TableCell>
                            <TableCell>
                              {gw.champions.map((c) => c.player_name).join(", ")}
                            </TableCell>
                            <TableCell>
                              {gw.champions.map((c) => c.entry_name).join(", ")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-accent">
                              {gw.champions[0].points}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              </>
            </ErrorBoundary>
          ),
          transfers: (
            <ErrorBoundary name="transfers">
              <TransfersData leagueData={leagueData} />
            </ErrorBoundary>
          ),
          compare: (
            <ErrorBoundary name="compare">
              <ManagerComparison leagueData={leagueData} />
            </ErrorBoundary>
          ),
          stats: (
            <ErrorBoundary name="stats">
              <Suspense fallback={<EnhancedSkeleton type="stats" />}>
                <Statistics leagueData={leagueData} gameweekChampions={gameweekChampions} />
              </Suspense>
            </ErrorBoundary>
          ),
          chips: (
            <ErrorBoundary name="chips">
              <ChipsUsed leagueData={leagueData} currentGameweek={currentGameweek} />
            </ErrorBoundary>
          ),
        }}
      />
    </div>
  );
});
