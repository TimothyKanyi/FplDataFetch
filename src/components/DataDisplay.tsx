import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, BarChart3, Users, TrendingUp, Zap } from "lucide-react";
import { PerformanceChart } from "./PerformanceChart";
import { ManagerComparison } from "./ManagerComparison";
import { Statistics } from "./Statistics";
import { ChipsUsed } from "./ChipsUsed";

interface Chip {
  name: string;
  time: string;
  event: number;
}

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
  chips: Chip[];
}

interface GameweekChampion {
  gameweek: number;
  champions: {
    player_name: string;
    entry_name: string;
    points: number;
  }[];
}

interface DataDisplayProps {
  leagueData: Manager[] | null;
  gameweekChampions: GameweekChampion[] | null;
}

export const DataDisplay = ({ leagueData, gameweekChampions }: DataDisplayProps) => {
  if (!leagueData || !gameweekChampions) return null;

  const gameweeks = leagueData[0]?.gameweek_points 
    ? Object.keys(leagueData[0].gameweek_points).sort((a, b) => Number(a) - Number(b))
    : [];

  const getMaxPointsForGameweek = (gw: string) => {
    return Math.max(...leagueData.map(m => m.gameweek_points[gw] || 0));
  };

  return (
    <Tabs defaultValue="standings" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="standings" className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Standings</span>
        </TabsTrigger>
        <TabsTrigger value="charts" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Charts</span>
        </TabsTrigger>
        <TabsTrigger value="compare" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Compare</span>
        </TabsTrigger>
        <TabsTrigger value="stats" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Stats</span>
        </TabsTrigger>
        <TabsTrigger value="chips" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Chips</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="standings" className="space-y-6">
        {/* League Standings */}
        <Card>
          <CardHeader>
            <CardTitle>League Standings</CardTitle>
            <CardDescription>
              Overall rankings with gameweek-by-gameweek points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full rounded-md border overflow-auto max-h-[500px] relative">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="sticky top-0 bg-card z-10 w-[80px]">Rank</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10">Manager</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10">Team Name</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-right">Total</TableHead>
                      {gameweeks.map((gw) => (
                        <TableHead key={gw} className="sticky top-0 bg-card z-10 text-right whitespace-nowrap">
                          GW{gw}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leagueData.map((manager) => (
                      <TableRow key={manager.entry}>
                        <TableCell className="font-medium">{manager.rank}</TableCell>
                        <TableCell>{manager.player_name}</TableCell>
                        <TableCell>{manager.entry_name}</TableCell>
                        <TableCell className="text-right font-bold">{manager.total}</TableCell>
                        {gameweeks.map((gw) => {
                          const points = manager.gameweek_points[gw] || 0;
                          const maxPoints = getMaxPointsForGameweek(gw);
                          const isHighest = points === maxPoints && points > 0;
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
                    ))}
                  </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        {/* Gameweek Champions */}
        <Card>
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
            <div className="w-full rounded-md border overflow-auto max-h-[400px] relative">
              <Table>
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
      </TabsContent>

      <TabsContent value="charts">
        <PerformanceChart leagueData={leagueData} />
      </TabsContent>

      <TabsContent value="compare">
        <ManagerComparison leagueData={leagueData} />
      </TabsContent>

      <TabsContent value="stats">
        <Statistics leagueData={leagueData} gameweekChampions={gameweekChampions} />
      </TabsContent>

      <TabsContent value="chips">
        <ChipsUsed leagueData={leagueData} />
      </TabsContent>
    </Tabs>
  );
};
