import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy } from "lucide-react";

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

interface DataDisplayProps {
  leagueData: Manager[] | null;
  gameweekChampions: GameweekChampion[] | null;
}

export const DataDisplay = ({ leagueData, gameweekChampions }: DataDisplayProps) => {
  if (!leagueData || !gameweekChampions) return null;

  const gameweeks = leagueData[0]?.gameweek_points 
    ? Object.keys(leagueData[0].gameweek_points).sort((a, b) => Number(a) - Number(b))
    : [];

  return (
    <div className="space-y-6">
      {/* League Standings */}
      <Card>
        <CardHeader>
          <CardTitle>League Standings</CardTitle>
          <CardDescription>
            Overall rankings with gameweek-by-gameweek points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full rounded-md border">
            <div className="max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Rank</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Team Name</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {gameweeks.map((gw) => (
                      <TableHead key={gw} className="text-right whitespace-nowrap">
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
                      {gameweeks.map((gw) => (
                        <TableCell key={gw} className="text-right">
                          {manager.gameweek_points[gw] || 0}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
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
          <ScrollArea className="w-full rounded-md border">
            <div className="max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Gameweek</TableHead>
                    <TableHead>Manager(s)</TableHead>
                    <TableHead>Team Name(s)</TableHead>
                    <TableHead className="text-right">Points</TableHead>
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
