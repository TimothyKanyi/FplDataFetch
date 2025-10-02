import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
}

interface ManagerComparisonProps {
  leagueData: Manager[];
}

export const ManagerComparison = ({ leagueData }: ManagerComparisonProps) => {
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

  const handleManagerSelect = (value: string, index: number) => {
    const newSelected = [...selectedManagers];
    newSelected[index] = value;
    setSelectedManagers(newSelected);
  };

  const getManagerById = (entryId: string) => {
    return leagueData.find(m => m.entry.toString() === entryId);
  };

  const managers = selectedManagers.map(id => getManagerById(id)).filter(Boolean) as Manager[];
  
  const gameweeks = leagueData[0]?.gameweek_points 
    ? Object.keys(leagueData[0].gameweek_points).sort((a, b) => Number(a) - Number(b))
    : [];

  const calculateAverage = (manager: Manager) => {
    const points = Object.values(manager.gameweek_points);
    return points.length ? (points.reduce((a, b) => a + b, 0) / points.length).toFixed(1) : "0";
  };

  const calculateHighest = (manager: Manager) => {
    const points = Object.values(manager.gameweek_points);
    return points.length ? Math.max(...points) : 0;
  };

  const calculateLowest = (manager: Manager) => {
    const points = Object.values(manager.gameweek_points);
    return points.length ? Math.min(...points) : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Manager Comparison
        </CardTitle>
        <CardDescription>
          Select up to 3 managers to compare their performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <Select
              key={index}
              value={selectedManagers[index] || ""}
              onValueChange={(value) => handleManagerSelect(value, index)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select Manager ${index + 1}`} />
              </SelectTrigger>
              <SelectContent>
                {leagueData.map((manager) => (
                  <SelectItem
                    key={manager.entry}
                    value={manager.entry.toString()}
                    disabled={selectedManagers.includes(manager.entry.toString())}
                  >
                    {manager.player_name} ({manager.entry_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        {managers.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {managers.map((manager) => (
                <Card key={manager.entry}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{manager.player_name}</CardTitle>
                    <CardDescription className="text-sm">{manager.entry_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rank:</span>
                      <span className="font-semibold">{manager.rank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Points:</span>
                      <span className="font-semibold">{manager.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average:</span>
                      <span className="font-semibold">{calculateAverage(manager)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Highest GW:</span>
                      <span className="font-semibold text-accent">{calculateHighest(manager)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lowest GW:</span>
                      <span className="font-semibold">{calculateLowest(manager)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gameweek Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gameweek</TableHead>
                      {managers.map((manager) => (
                        <TableHead key={manager.entry} className="text-right">
                          {manager.player_name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameweeks.map((gw) => (
                      <TableRow key={gw}>
                        <TableCell className="font-medium">GW {gw}</TableCell>
                        {managers.map((manager) => {
                          const points = manager.gameweek_points[gw] || 0;
                          const isHighest = managers.every(m => (m.gameweek_points[gw] || 0) <= points);
                          return (
                            <TableCell
                              key={manager.entry}
                              className={`text-right ${isHighest && managers.length > 1 ? "font-bold text-accent" : ""}`}
                            >
                              {points}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
