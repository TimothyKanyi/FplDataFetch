import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

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

interface ChipsUsedProps {
  leagueData: Manager[];
}

const chipDisplayNames: { [key: string]: string } = {
  "3xc": "Triple Captain",
  "bboost": "Bench Boost",
  "freehit": "Free Hit",
  "wildcard": "Wildcard",
};

const chipColors: { [key: string]: string } = {
  "3xc": "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  "bboost": "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  "freehit": "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  "wildcard": "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
};

export const ChipsUsed = ({ leagueData }: ChipsUsedProps) => {
  const allChips = ["3xc", "bboost", "freehit", "wildcard"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          Chips Used
        </CardTitle>
        <CardDescription>
          Track which managers have used their chips
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full rounded-md border overflow-auto max-h-[600px] relative">
          <Table className="min-w-[800px]">
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead className="sticky top-0 bg-card z-10 w-[80px]">Rank</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10">Manager</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10">Team Name</TableHead>
                  {allChips.map((chip) => (
                    <TableHead key={chip} className="sticky top-0 bg-card z-10 text-center">
                      {chipDisplayNames[chip]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leagueData.map((manager) => {
                  const usedChips = new Map(
                    manager.chips.map((chip) => [chip.name, chip.event])
                  );

                  return (
                    <TableRow key={manager.entry}>
                      <TableCell className="font-medium">{manager.rank}</TableCell>
                      <TableCell>{manager.player_name}</TableCell>
                      <TableCell>{manager.entry_name}</TableCell>
                      {allChips.map((chip) => {
                        const gameweek = usedChips.get(chip);
                        return (
                          <TableCell key={chip} className="text-center">
                            {gameweek ? (
                              <Badge
                                variant="outline"
                                className={chipColors[chip]}
                              >
                                GW {gameweek}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};
