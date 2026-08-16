import { useCallback, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
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
import { Download, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { Manager } from "@/hooks/useFplData";

const MY_TEAM_KEY = (leagueCode: string) => `fpl_my_team_${leagueCode}`;

interface ShareCardProps {
  leagueCode: string;
  leagueName?: string;
  leagueData: Manager[];
}

/**
 * Shareable result card. Renders a fixed-size summary card (league name, top 3,
 * the user's rank + rank movement) and exports it as a PNG via html-to-image.
 * The user's team selection is persisted in localStorage per league.
 */
export const ShareCard = ({ leagueCode, leagueName, leagueData }: ShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [myEntry, setMyEntry] = useState<number | null>(() => {
    const saved = localStorage.getItem(MY_TEAM_KEY(leagueCode));
    if (saved) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed) && leagueData.some((m) => m.entry === parsed)) {
        return parsed;
      }
    }
    return leagueData[0]?.entry ?? null;
  });

  const myManager = useMemo(
    () => leagueData.find((m) => m.entry === myEntry) ?? null,
    [leagueData, myEntry]
  );

  const topThree = useMemo(() => leagueData.slice(0, 3), [leagueData]);

  // Positive = moved up, negative = moved down, null = no movement data.
  const rankMovement = useMemo(() => {
    if (!myManager || myManager.last_rank == null) return null;
    return myManager.last_rank - myManager.rank;
  }, [myManager]);

  const handleSelect = (value: string) => {
    const entry = Number(value);
    setMyEntry(entry);
    localStorage.setItem(MY_TEAM_KEY(leagueCode), String(entry));
  };

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 640,
        height: 400,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `fpl_league_${leagueCode}_card.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Share card downloaded!");
    } catch (err) {
      console.error("Failed to export share card:", err);
      toast.error("Failed to export card. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [leagueCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-accent" />
          Share Result Card
        </CardTitle>
        <CardDescription>
          Export a PNG summary of this league to share with your friends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Identify "you" — persisted per league */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm text-muted-foreground">This is my team:</span>
          <Select
            value={myEntry ? String(myEntry) : ""}
            onValueChange={handleSelect}
          >
            <SelectTrigger className="w-full sm:w-[340px]">
              <SelectValue placeholder="Select your team" />
            </SelectTrigger>
            <SelectContent>
              {leagueData.map((m) => (
                <SelectItem key={m.entry} value={String(m.entry)}>
                  {m.player_name} ({m.entry_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fixed-size card (captured by html-to-image) */}
        <div className="overflow-x-auto">
          <div
            ref={cardRef}
            style={{
              width: 640,
              height: 400,
              fontFamily:
                "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            }}
            className="mx-auto flex flex-col rounded-xl border border-border bg-background p-6 text-foreground"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  FPL Mini-League
                </p>
                <h3 className="text-2xl font-bold leading-tight truncate">
                  {leagueName || `League ${leagueCode}`}
                </h3>
              </div>
              <Trophy className="h-8 w-8 shrink-0 text-accent" />
            </div>

            {/* Top 3 */}
            <div className="mt-4 flex-1 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top 3 Managers
              </p>
              {topThree.map((m, i) => (
                <div
                  key={m.entry}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="w-8 text-lg font-bold text-accent">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.player_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {m.entry_name}
                    </p>
                  </div>
                  <span className="font-bold">{m.total} pts</span>
                </div>
              ))}
            </div>

            {/* Your rank */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">
                Your rank
              </span>
              {myManager ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">#{myManager.rank}</span>
                  {rankMovement != null && rankMovement > 0 && (
                    <span className="text-sm font-semibold text-green-600">
                      ▲ {rankMovement}
                    </span>
                  )}
                  {rankMovement != null && rankMovement < 0 && (
                    <span className="text-sm font-semibold text-red-600">
                      ▼ {Math.abs(rankMovement)}
                    </span>
                  )}
                  {rankMovement === 0 && (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  <span className="max-w-[180px] truncate text-sm">
                    {myManager.player_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Select your team above
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || !myManager}
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Download PNG"}
        </Button>
      </CardContent>
    </Card>
  );
};
