import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface CaptainPick {
  gameweek: number;
  captain: string;
  captain_points: number;
  vice_captain: string;
  vice_captain_points: number;
}

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
  captains: CaptainPick[];
}

interface CaptainsPicksProps {
  leagueData: Manager[];
}

export const CaptainsPicks = ({ leagueData }: CaptainsPicksProps) => {
  const [selectedManager, setSelectedManager] = useState<string>("all");
  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");

  // Get unique gameweeks
  const gameweeks = leagueData[0]?.captains
    ? Array.from(new Set(leagueData.flatMap(m => m.captains.map(c => c.gameweek)))).sort((a, b) => a - b)
    : [];

  // Filter data based on selections
  const filteredData = leagueData
    .filter(manager => selectedManager === "all" || manager.entry.toString() === selectedManager)
    .map(manager => ({
      ...manager,
      captains: manager.captains.filter(pick => 
        selectedGameweek === "all" || pick.gameweek.toString() === selectedGameweek
      )
    }))
    .filter(manager => manager.captains.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Captains
          </CardTitle>
          <CardDescription>
            View each manager's Captain and Vice-Captain picks for every gameweek — past and present.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filter by Manager</label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger>
                  <SelectValue placeholder="All Managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  {leagueData.map(manager => (
                    <SelectItem key={manager.entry} value={manager.entry.toString()}>
                      {manager.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filter by Gameweek</label>
              <Select value={selectedGameweek} onValueChange={setSelectedGameweek}>
                <SelectTrigger>
                  <SelectValue placeholder="All Gameweeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gameweeks</SelectItem>
                  {gameweeks.map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>
                      Gameweek {gw}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards Display */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredData.map(manager => (
              <Card key={manager.entry} className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{manager.player_name}</CardTitle>
                  <CardDescription className="text-xs">{manager.entry_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {manager.captains.map(pick => (
                    <div key={pick.gameweek} className="border-l-2 border-accent/50 pl-3 py-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          GW {pick.gameweek}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{pick.captain}</p>
                            <p className="text-xs text-muted-foreground">Captain</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-accent">
                              {pick.captain_points} pts
                            </p>
                            <p className="text-xs text-muted-foreground">×2</p>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{pick.vice_captain}</p>
                            <p className="text-xs text-muted-foreground">Vice-Captain</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium">
                              {pick.vice_captain_points} pts
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No captain data available for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};