import { useMemo, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Award, TrendingUp, Target } from "lucide-react";
import type { Manager, GameweekChampion } from "@/hooks/useFplData";
import {
  useChampionStats,
  useManagerConsistency,
  useAvgPointsPerGW,
  useGameweeks,
} from "@/hooks/useFplComputed";

interface StatisticsProps {
  leagueData: Manager[];
  gameweekChampions: GameweekChampion[];
}

// Memoized chart configuration to prevent recreation
const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

// Memoized stat cards to prevent unnecessary re-renders
const StatCard = memo(
  ({
    title,
    icon: Icon,
    value,
    subtext,
    accent = false,
  }: {
    title: string;
    icon: React.ElementType;
    value: string | number;
    subtext: string;
    accent?: boolean;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent ? "text-accent" : ""}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  )
);

export const Statistics = memo(({ leagueData, gameweekChampions }: StatisticsProps) => {
  // Use memoized gameweeks - only recalculates when leagueData changes
  const gameweeks = useGameweeks(leagueData);

  // Use custom hooks for expensive computations
  const topChampions = useChampionStats(gameweekChampions);
  const managersWithConsistency = useManagerConsistency(leagueData);
  const avgPointsPerGW = useAvgPointsPerGW(leagueData, gameweeks);

  // Memoized summary stats
  const leagueAverage = useMemo(() => {
    return leagueData.length
      ? (leagueData.reduce((sum, m) => sum + m.total, 0) / leagueData.length).toFixed(0)
      : "0";
  }, [leagueData]);

  const highestSingleGW = useMemo(() => {
    if (!gameweekChampions.length) return 0;
    return Math.max(...gameweekChampions.map((gw) => gw.champions[0].points));
  }, [gameweekChampions]);

  return (
    <div className="space-y-6">
      {/* Memoized stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="League Average"
          icon={Target}
          value={leagueAverage}
          subtext="Total points across all managers"
        />
        <StatCard
          title="Highest Single GW"
          icon={TrendingUp}
          value={highestSingleGW}
          subtext="Best individual gameweek score"
          accent
        />
        <StatCard
          title="Total Managers"
          icon={Award}
          value={leagueData.length}
          subtext="Competing in this league"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Most Gameweek Wins</CardTitle>
            <CardDescription>Managers with the most gameweek victories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topChampions}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-muted-foreground"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis className="text-muted-foreground" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="wins" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Consistent Managers</CardTitle>
            <CardDescription>Top 5 managers with the most stable performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {managersWithConsistency.slice(0, 5).map((manager, index) => (
                <div key={manager.entry} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{manager.player_name}</p>
                      <p className="text-xs text-muted-foreground">Avg: {manager.average} pts</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">{manager.consistency}</p>
                    <p className="text-xs text-muted-foreground">consistency</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>League Average Per Gameweek</CardTitle>
          <CardDescription>Average points scored across all managers each gameweek</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgPointsPerGW}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="gameweek" className="text-muted-foreground" />
              <YAxis className="text-muted-foreground" />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="average" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
});
