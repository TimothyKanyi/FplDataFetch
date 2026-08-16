import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { TransfersData } from "./TransfersData";
import { ManagerComparison } from "./ManagerComparison";
import { Statistics } from "./Statistics";
import { ChipsUsed } from "./ChipsUsed";
import { AnimatedTabs } from "./AnimatedTabs";
import type { Manager, GameweekChampion } from "@/hooks/useFplData";
import { useGameweeks, useIsHighestPoints } from "@/hooks/useFplComputed";

interface DataDisplayProps {
  leagueData: Manager[] | null;
  gameweekChampions: GameweekChampion[] | null;
  currentGameweek?: number;
}

// Memoized table row component to prevent re-render of all rows
const ManagerTableRow = memo(
  ({
    manager,
    gameweeks,
    isHighestPoints,
  }: {
    manager: Manager;
    gameweeks: string[];
    isHighestPoints: (gw: string, points: number) => boolean;
  }) => (
    <TableRow>
      <TableCell className="font-medium">{manager.rank}</TableCell>
      <TableCell>{manager.player_name}</TableCell>
      <TableCell>{manager.entry_name}</TableCell>
      <TableCell className="text-right font-bold">{manager.total}</TableCell>
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

export const DataDisplay = memo(({ leagueData, gameweekChampions, currentGameweek }: DataDisplayProps) => {
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
            <>
              {/* League Standings */}
              <Card>
                <CardHeader>
                  <CardTitle>League Standings</CardTitle>
                  <CardDescription>
                    Overall rankings with gameweek-by-gameweek points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full rounded-md border overflow-x-auto overflow-y-auto max-h-[500px] relative">
                    <Table className="min-w-[800px]">
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
                          <ManagerTableRow
                            key={manager.entry}
                            manager={manager}
                            gameweeks={gameweeks}
                            isHighestPoints={isHighestPoints}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
          ),
          transfers: <TransfersData leagueData={leagueData} />,
          compare: <ManagerComparison leagueData={leagueData} />,
          stats: <Statistics leagueData={leagueData} gameweekChampions={gameweekChampions} />,
          chips: <ChipsUsed leagueData={leagueData} currentGameweek={currentGameweek} />,
        }}
      />
    </div>
  );
});
