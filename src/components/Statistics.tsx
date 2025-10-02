import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Award, TrendingUp, Target } from "lucide-react";

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
}

interface GameweekChampion {
  gameweek: number;
  champions: {
    player_name: string;
    entry_name: string;
    points: number;
  }[];
}

interface StatisticsProps {
  leagueData: Manager[];
  gameweekChampions: GameweekChampion[];
}

export const Statistics = ({ leagueData, gameweekChampions }: StatisticsProps) => {
  const gameweeks = leagueData[0]?.gameweek_points 
    ? Object.keys(leagueData[0].gameweek_points).sort((a, b) => Number(a) - Number(b))
    : [];

  // Calculate champion frequency
  const championCounts: { [key: string]: number } = {};
  gameweekChampions.forEach((gw) => {
    gw.champions.forEach((champion) => {
      championCounts[champion.player_name] = (championCounts[champion.player_name] || 0) + 1;
    });
  });

  const topChampions = Object.entries(championCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, wins: count }));

  // Calculate consistency (standard deviation)
  const managersWithConsistency = leagueData.map((manager) => {
    const points = Object.values(manager.gameweek_points);
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    const variance = points.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / points.length;
    const stdDev = Math.sqrt(variance);
    return {
      ...manager,
      average: avg.toFixed(1),
      consistency: (100 - stdDev).toFixed(1), // Lower stdDev = higher consistency
    };
  }).sort((a, b) => Number(b.consistency) - Number(a.consistency));

  // Average points per gameweek across all managers
  const avgPointsPerGW = gameweeks.map((gw) => {
    const total = leagueData.reduce((sum, m) => sum + (m.gameweek_points[gw] || 0), 0);
    return {
      gameweek: `GW${gw}`,
      average: (total / leagueData.length).toFixed(1),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              League Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(leagueData.reduce((sum, m) => sum + m.total, 0) / leagueData.length).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total points across all managers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Highest Single GW
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {Math.max(...gameweekChampions.map(gw => gw.champions[0].points))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Best individual gameweek score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Total Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leagueData.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Competing in this league
            </p>
          </CardContent>
        </Card>
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
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
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
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="average" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
