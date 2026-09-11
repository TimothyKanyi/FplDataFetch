import { memo, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Manager } from "@/hooks/useFplData";
import { useRankHistory } from "@/hooks/useLeagueHistory";

/**
 * localStorage key for the manager the visitor marked as theirs. Must stay in
 * sync with the key the share card's "my team" selector writes, so the
 * highlighted line and the share card agree.
 */
const MY_TEAM_KEY = (leagueCode: string) => `fpl_my_team_${leagueCode}`;

// Categorical palette. Distinct at a glance at typical mini-league sizes; past
// 20 managers colours repeat, and the legend plus hover-isolation become the
// way to tell lines apart.
const PALETTE = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#be123c", "#0369a1", "#a21caf", "#15803d",
  "#c2410c", "#1d4ed8", "#b91c1c", "#047857", "#6d28d9",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: 12,
};

interface RankChartProps {
  leagueCode: string;
  leagueData: Manager[];
  currentGameweek?: number;
}

/**
 * Bump chart of league position over time: one line per manager, rank on the
 * Y-axis inverted so rank 1 sits at the top.
 *
 * Past gameweeks come from archived snapshots. The current gameweek is appended
 * from the live standings so an in-progress gameweek doesn't sit a full round
 * behind.
 */
export const RankChart = memo(
  ({ leagueCode, leagueData, currentGameweek }: RankChartProps) => {
    const { data: series = [], isLoading } = useRankHistory(leagueCode || null);
    const [activeEntry, setActiveEntry] = useState<number | null>(null);
    const [hiddenEntries, setHiddenEntries] = useState<ReadonlySet<number>>(new Set());

    // The visitor's own entry, written by the share card's team selector.
    const myEntry = useMemo(() => {
      try {
        const stored = localStorage.getItem(MY_TEAM_KEY(leagueCode));
        return stored ? Number(stored) : null;
      } catch {
        return null;
      }
    }, [leagueCode]);

    const managers = useMemo(
      () =>
        series.map((item, index) => ({
          entry: item.entry,
          name: item.player_name,
          color: PALETTE[index % PALETTE.length],
          isMine: item.entry === myEntry,
        })),
      [series, myEntry]
    );

    // One row per gameweek, keyed by manager entry. Archived snapshots supply
    // the past gameweeks; live standings overwrite the current one.
    const rows = useMemo(() => {
      const gameweeks = new Set<number>();
      series.forEach((item) =>
        item.points.forEach((point) => gameweeks.add(point.gameweek))
      );

      const hasLive =
        Number(currentGameweek) > 0 && leagueData.length > 0;
      if (hasLive) gameweeks.add(Number(currentGameweek));

      return [...gameweeks]
        .sort((a, b) => a - b)
        .map((gameweek) => {
          const row: Record<string, number> = { gameweek };

          series.forEach((item) => {
            const point = item.points.find((p) => p.gameweek === gameweek);
            if (point) row[String(item.entry)] = point.rank;
          });

          if (hasLive && gameweek === Number(currentGameweek)) {
            leagueData.forEach((manager) => {
              row[String(manager.entry)] = manager.rank;
            });
          }

          return row;
        });
    }, [series, leagueData, currentGameweek]);

    const maxRank = useMemo(() => {
      let max = 0;
      series.forEach((item) =>
        item.points.forEach((point) => {
          if (point.rank > max) max = point.rank;
        })
      );
      leagueData.forEach((manager) => {
        if (manager.rank > max) max = manager.rank;
      });
      return Math.max(max, 1);
    }, [series, leagueData]);

    // Explicit ticks so rank 1 is always labelled — recharts' auto ticks can
    // start at 5, which hides the top of the scale on a chart that is entirely
    // about position.
    const yAxisTicks = useMemo(() => {
      if (maxRank <= 1) return [1];
      const steps = Math.min(maxRank, 6);
      const step = Math.max(1, Math.round((maxRank - 1) / (steps - 1)));
      const ticks: number[] = [];
      for (let rank = 1; rank <= maxRank; rank += step) ticks.push(rank);
      if (ticks[ticks.length - 1] !== maxRank) ticks.push(maxRank);
      return ticks;
    }, [maxRank]);

    const toggleEntry = (entry: number) => {
      setHiddenEntries((previous) => {
        const next = new Set(previous);
        if (next.has(entry)) {
          next.delete(entry);
        } else {
          next.add(entry);
        }
        return next;
      });
    };

    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Rank Over Time</CardTitle>
            <CardDescription>
              Each manager&apos;s league position after every gameweek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading rank history…</p>
          </CardContent>
        </Card>
      );
    }

    // A single archived gameweek can't show movement, so explain rather than
    // render a chart with nothing in it.
    const hasEnoughHistory = rows.length >= 2 && managers.length > 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Rank Over Time</CardTitle>
          <CardDescription>
            Each manager&apos;s league position after every gameweek
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasEnoughHistory ? (
            <p className="text-sm text-muted-foreground">
              Rank history builds up as gameweeks complete — it appears once two
              or more gameweeks have been archived. Check back after the next
              deadline.
            </p>
          ) : (
            <>
              <div
                role="img"
                aria-label={`League position per gameweek for ${managers.length} managers`}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={rows}
                    margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                    onMouseLeave={() => setActiveEntry(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="gameweek"
                      allowDecimals={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      reversed
                      domain={[1, maxRank]}
                      ticks={yAxisTicks}
                      interval={0}
                      allowDecimals={false}
                      width={40}
                      className="text-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(gameweek) => `Gameweek ${gameweek}`}
                    />
                    {managers
                      .filter((manager) => !hiddenEntries.has(manager.entry))
                      .map((manager) => {
                        const dimmed =
                          activeEntry !== null && activeEntry !== manager.entry;
                        return (
                          <Line
                            key={manager.entry}
                            type="linear"
                            dataKey={String(manager.entry)}
                            name={manager.name}
                            stroke={
                              manager.isMine ? "hsl(var(--accent))" : manager.color
                            }
                            strokeWidth={manager.isMine ? 3 : 1.5}
                            strokeOpacity={dimmed ? 0.12 : 1}
                            dot={manager.isMine ? { r: 3 } : false}
                            activeDot={{ r: 5 }}
                            connectNulls
                            isAnimationActive={false}
                            onMouseEnter={() => setActiveEntry(manager.entry)}
                          />
                        );
                      })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Hand-rolled rather than recharts' Legend so it wraps
                  predictably and stays usable with a full league of managers.
                  Hover isolates a line, click hides it. */}
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                {managers.map((manager) => {
                  const isHidden = hiddenEntries.has(manager.entry);
                  const isActive = activeEntry === manager.entry;
                  return (
                    <button
                      key={manager.entry}
                      type="button"
                      onMouseEnter={() => setActiveEntry(manager.entry)}
                      onMouseLeave={() => setActiveEntry(null)}
                      onFocus={() => setActiveEntry(manager.entry)}
                      onBlur={() => setActiveEntry(null)}
                      onClick={() => toggleEntry(manager.entry)}
                      aria-pressed={!isHidden}
                      title={`${isHidden ? "Show" : "Hide"} ${manager.name}`}
                      className={`flex items-center gap-1.5 text-xs transition-opacity ${
                        isHidden ? "opacity-40" : "opacity-100"
                      } ${isActive ? "font-semibold" : ""}`}
                    >
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: manager.isMine
                            ? "hsl(var(--accent))"
                            : manager.color,
                        }}
                      />
                      <span className={isHidden ? "line-through" : ""}>
                        {manager.name}
                        {manager.isMine ? " (you)" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Hover a line to isolate it, or click a name to hide it. Rank 1 is
                at the top.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
);

RankChart.displayName = "RankChart";
