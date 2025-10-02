import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
}

interface PerformanceChartProps {
  leagueData: Manager[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444"];

export const PerformanceChart = ({ leagueData }: PerformanceChartProps) => {
  const topManagers = leagueData.slice(0, 6);
  
  const gameweeks = topManagers[0]?.gameweek_points 
    ? Object.keys(topManagers[0].gameweek_points).sort((a, b) => Number(a) - Number(b))
    : [];

  const chartData = gameweeks.map((gw) => {
    const dataPoint: any = { gameweek: `GW${gw}` };
    topManagers.forEach((manager) => {
      dataPoint[manager.player_name] = manager.gameweek_points[gw] || 0;
    });
    return dataPoint;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Chart
        </CardTitle>
        <CardDescription>
          Points per gameweek for top 6 managers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="gameweek" 
              className="text-muted-foreground"
            />
            <YAxis className="text-muted-foreground" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px"
              }}
            />
            <Legend />
            {topManagers.map((manager, index) => (
              <Line
                key={manager.entry}
                type="monotone"
                dataKey={manager.player_name}
                stroke={COLORS[index]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
