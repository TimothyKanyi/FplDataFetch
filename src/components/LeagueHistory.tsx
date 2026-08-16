import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History } from "lucide-react";
import { DataDisplay } from "./DataDisplay";
import { EnhancedSkeleton } from "./EnhancedSkeleton";
import { useLeagueHistory, useLeagueSnapshot } from "@/hooks/useLeagueHistory";

interface LeagueHistoryProps {
  leagueCode: string;
}

/**
 * Historical league archive. Lists gameweeks that have a saved snapshot and
 * renders the archived standings for the selected one.
 */
export const LeagueHistory = ({ leagueCode }: LeagueHistoryProps) => {
  const [selectedGW, setSelectedGW] = useState<number | null>(null);

  const {
    data: gameweeks,
    isLoading,
    isError,
  } = useLeagueHistory(leagueCode);
  const {
    data: snapshot,
    isLoading: isLoadingSnapshot,
  } = useLeagueSnapshot(leagueCode, selectedGW);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            League Archive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedSkeleton type="standings" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !gameweeks?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            League Archive
          </CardTitle>
          <CardDescription>
            No archived gameweeks yet. Snapshots are saved automatically after
            each gameweek finishes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          League Archive
        </CardTitle>
        <CardDescription>
          Browse standings saved at the end of previous gameweeks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm text-muted-foreground">Gameweek:</span>
          <Select
            value={selectedGW ? String(selectedGW) : ""}
            onValueChange={(value) => setSelectedGW(Number(value))}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Select a gameweek" />
            </SelectTrigger>
            <SelectContent>
              {gameweeks.map((gw) => (
                <SelectItem key={gw.gameweek} value={String(gw.gameweek)}>
                  Gameweek {gw.gameweek}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoadingSnapshot ? (
          <EnhancedSkeleton type="standings" />
        ) : snapshot?.leagueData?.length ? (
          <DataDisplay
            leagueData={snapshot.leagueData}
            gameweekChampions={snapshot.gameweekChampions}
            currentGameweek={snapshot.currentGameweek}
          />
        ) : selectedGW ? (
          <p className="text-sm text-muted-foreground">
            No snapshot found for that gameweek.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
