import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const CARD_WIDTH = 640;

interface ShareCardProps {
  leagueCode: string;
  leagueName?: string;
  leagueData: Manager[];
}

interface CardPreviewProps {
  leagueName?: string;
  leagueCode: string;
  topThree: Manager[];
  myManager: Manager | null;
  rankMovement: number | null;
}

/**
 * The actual fixed-width card. Rendered twice: once on-screen (scaled to fit)
 * and once off-screen at full size for the PNG export. Explicit colors (not
 * theme variables) keep the exported image consistent in light/dark mode.
 */
const CardPreview = forwardRef<HTMLDivElement, CardPreviewProps>(
  ({ leagueName, leagueCode, topThree, myManager, rankMovement }, ref) => (
    <div
      ref={ref}
      style={{
        width: CARD_WIDTH,
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
      className="flex flex-col rounded-xl border border-slate-200 p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            FPL Mini-League
          </p>
          <h3 className="text-2xl font-bold leading-tight truncate text-slate-900">
            {leagueName || `League ${leagueCode}`}
          </h3>
        </div>
        <Trophy className="h-8 w-8 shrink-0 text-emerald-600" />
      </div>

      {/* Top 3 */}
      <div className="mt-4 flex-1 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Top 3 Managers
        </p>
        {topThree.map((m, i) => (
          <div
            key={m.entry}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <span className="w-8 text-lg font-bold text-emerald-600">
              #{i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">
                {m.player_name}
              </p>
              <p className="truncate text-sm text-slate-500">{m.entry_name}</p>
            </div>
            <span className="font-bold text-slate-900">{m.total} pts</span>
          </div>
        ))}
      </div>

      {/* Your rank */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-500">Your rank</span>
        {myManager ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-900">
              #{myManager.rank}
            </span>
            {rankMovement != null && rankMovement > 0 && (
              <span className="text-sm font-semibold text-emerald-600">
                ▲ {rankMovement}
              </span>
            )}
            {rankMovement != null && rankMovement < 0 && (
              <span className="text-sm font-semibold text-red-600">
                ▼ {Math.abs(rankMovement)}
              </span>
            )}
            {rankMovement === 0 && (
              <span className="text-sm text-slate-500">—</span>
            )}
            <span className="max-w-[180px] truncate text-sm text-slate-700">
              {myManager.player_name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Select your team above</span>
        )}
      </div>
    </div>
  )
);
CardPreview.displayName = "CardPreview";

/**
 * Shareable result card. Renders a fixed-size summary card (league name, top 3,
 * the user's rank + rank movement) and exports it as a PNG via html-to-image.
 * The user's team selection is persisted in localStorage per league.
 */
export const ShareCard = ({ leagueCode, leagueName, leagueData }: ShareCardProps) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [scale, setScale] = useState(1);
  const [cardHeight, setCardHeight] = useState(400);

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

  // Scale the on-screen preview down so it fits narrow viewports without
  // clipping. The off-screen export node always stays at the full 640px width.
  useEffect(() => {
    const container = containerRef.current;
    const exportNode = exportRef.current;
    if (!container) return;

    const update = () => {
      setScale(Math.min(1, container.clientWidth / CARD_WIDTH));
      if (exportNode) setCardHeight(exportNode.offsetHeight);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [leagueData, myManager, leagueName]);

  const handleSelect = (value: string) => {
    const entry = Number(value);
    setMyEntry(entry);
    localStorage.setItem(MY_TEAM_KEY(leagueCode), String(entry));
  };

  const handleExport = useCallback(async () => {
    const node = exportRef.current;
    if (!node) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(node, {
        width: node.offsetWidth,
        height: node.offsetHeight,
        pixelRatio: 2,
        cacheBust: true,
        // The card uses only system fonts, so skip webfont embedding. This also
        // avoids SecurityError noise from cross-origin Google Fonts stylesheets.
        skipFonts: true,
      });
      const link = document.createElement("a");
      link.download = `fpl_league_${leagueCode}_card.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

        {/* Visible, responsive preview */}
        <div ref={containerRef} className="w-full">
          <div style={{ height: cardHeight * scale }}>
            <div
              style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
            >
              <CardPreview
                leagueName={leagueName}
                leagueCode={leagueCode}
                topThree={topThree}
                myManager={myManager}
                rankMovement={rankMovement}
              />
            </div>
          </div>
        </div>

        {/* Off-screen, fixed-size node used only for the PNG export */}
        <div
          style={{ position: "fixed", left: -9999, top: 0 }}
          aria-hidden="true"
        >
          <CardPreview
            ref={exportRef}
            leagueName={leagueName}
            leagueCode={leagueCode}
            topThree={topThree}
            myManager={myManager}
            rankMovement={rankMovement}
          />
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
