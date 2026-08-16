import { useCallback, useMemo, memo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { LeagueForm } from "@/components/LeagueForm";
import { DataDisplay } from "@/components/DataDisplay";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DonationSection } from "@/components/DonationSection";
import { ShareCard } from "@/components/ShareCard";
import { LeagueHistory } from "@/components/LeagueHistory";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { useFplData, useFplDownload, fplQueryKeys } from "@/hooks/useFplData";
import { useQueryClient } from "@tanstack/react-query";

// Memoized child components to prevent unnecessary re-renders
const MemoizedDataDisplay = memo(DataDisplay);

const LAST_LEAGUE_KEY = "fpl_last_league";

// Reserved demo league ID. Never matches a real FPL league (FPL IDs are
// numeric). The prewarm-cache cron skips this ID, and it must never be used by
// real-data cleanup, so the seeded demo payload is never overwritten.
const DEMO_LEAGUE_CODE = "demo-league-001";

interface FetchParams {
  leagueCode: string;
  startGW: number;
  endGW: number;
}

const loadSavedLeague = (): FetchParams | null => {
  try {
    const raw = localStorage.getItem(LAST_LEAGUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.leagueCode === "string" && parsed.leagueCode.trim()) {
      return {
        leagueCode: parsed.leagueCode,
        startGW: Number(parsed.startGW) || 1,
        endGW: Number(parsed.endGW) || 38,
      };
    }
  } catch {
    // Ignore corrupt/inaccessible storage.
  }
  return null;
};

const parseGwRange = (raw: string | null): { startGW: number; endGW: number } => {
  const [s, e] = (raw || "1-38").split("-").map((n) => parseInt(n, 10));
  return { startGW: s || 1, endGW: e || 38 };
};

const Index = () => {
  const { leagueId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // URL takes precedence over the saved league (shareable/bookmarkable).
  const gwParam = searchParams.get("gw");
  const fetchParams = useMemo<FetchParams | null>(() => {
    if (leagueId) {
      const { startGW, endGW } = parseGwRange(gwParam);
      return { leagueCode: leagueId, startGW, endGW };
    }
    return loadSavedLeague();
  }, [leagueId, gwParam]);

  const isRestored = !leagueId && !!fetchParams; // restored from localStorage
  const isDemo = fetchParams?.leagueCode === DEMO_LEAGUE_CODE;

  // Optimized data fetching with TanStack Query
  const {
    data,
    dataUpdatedAt,
    isLoading,
    isFetching,
    error,
    isError,
    refetch,
  } = useFplData(fetchParams);

  // CSV download mutation
  const downloadMutation = useFplDownload();

  // Memoized fetch handler - prevents recreation on every render
  const handleFetch = useCallback(
    async (leagueCode: string, startGW: number, endGW: number) => {
      // Persist so we can auto-restore on the next visit.
      try {
        localStorage.setItem(
          LAST_LEAGUE_KEY,
          JSON.stringify({ leagueCode, startGW, endGW })
        );
      } catch {
        // Storage unavailable — non-fatal.
      }

      // Check if we have cached data for instant display
      const cachedData = queryClient.getQueryData(
        fplQueryKeys.league(leagueCode, startGW, endGW)
      );

      if (cachedData) {
        toast.info("Using cached data, refreshing in background...");
      }

      // Reflect state in the URL (shareable/bookmarkable) without a reload.
      navigate(`/league/${encodeURIComponent(leagueCode)}?gw=${startGW}-${endGW}`);
    },
    [navigate, queryClient]
  );

  // Clear the saved league and return to the empty search state.
  const handleClearSaved = useCallback(() => {
    try {
      localStorage.removeItem(LAST_LEAGUE_KEY);
    } catch {
      // Storage unavailable — non-fatal.
    }
    navigate("/");
  }, [navigate]);

  // Handle manual retry
  const handleRetry = useCallback(() => {
    if (fetchParams) {
      refetch();
    }
  }, [fetchParams, refetch]);

  // CSV download handler
  const handleDownload = useCallback(
    async (leagueCode: string, startGW: number, endGW: number) => {
      try {
        const fileUrl = await downloadMutation.mutateAsync({
          leagueCode,
          startGW,
          endGW,
        });

        // Download the file
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `fpl_league_${leagueCode}_gw${startGW}-${endGW}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("CSV file downloaded successfully!");
      } catch (err) {
        console.error("Error downloading CSV:", err);
        toast.error("Failed to generate CSV file. Please try again.");
      }
    },
    [downloadMutation]
  );

  // Cancel ongoing requests
  const handleCancel = useCallback(() => {
    // TanStack Query cancellation is handled via AbortSignal automatically
    toast.info("Request cancelled");
  }, []);

  // Show error toast when query fails
  if (isError && error) {
    toast.error(
      error instanceof Error ? error.message : "Failed to fetch data",
      {
        action: {
          label: "Retry",
          onClick: handleRetry,
        },
      }
    );
  }

  const hasData = !!data?.leagueData?.length;
  const isInitialLoading = isLoading && !hasData;
  const isBackgroundRefreshing = isFetching && hasData;

  // Prefer the server-side fetchedAt; fall back to the client refetch time so
  // the "Updated" label also works for older cached payloads.
  const fetchedAt =
    data?.fetchedAt ??
    (dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : undefined);

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-8">
          {isRestored && fetchParams && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Continue where you left off — League{" "}
                <span className="font-semibold text-foreground">
                  {fetchParams.leagueCode}
                </span>{" "}
                · GW {fetchParams.startGW}–{fetchParams.endGW}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSaved}
              >
                Not your league? Search again
              </Button>
            </div>
          )}

          {isDemo && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
              <span className="rounded bg-blue-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                DEMO
              </span>
              <span className="text-muted-foreground">
                You're viewing a sample league — enter your own league ID for real data.
              </span>
            </div>
          )}

          <LeagueForm
            onFetch={handleFetch}
            onDownload={handleDownload}
            isLoading={isLoading || downloadMutation.isPending}
            isRefreshing={isBackgroundRefreshing}
            onCancel={handleCancel}
          />

          {isInitialLoading ? (
            <LoadingSkeleton />
          ) : hasData ? (
            <>
              <MemoizedDataDisplay
                leagueData={data.leagueData}
                gameweekChampions={data.gameweekChampions}
                currentGameweek={data.currentGameweek}
                isLive={data.isLive}
                fetchedAt={fetchedAt}
                deadlineTime={data.deadlineTime}
              />
              {/* Ad slot — below the standings table, not sticky. */}
              <AdBanner slot="xxxx" />
              <ShareCard
                key={fetchParams?.leagueCode ?? "league"}
                leagueCode={fetchParams?.leagueCode ?? ""}
                leagueName={data.leagueName}
                leagueData={data.leagueData}
              />
              <LeagueHistory leagueCode={fetchParams?.leagueCode ?? ""} />
            </>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleFetch(DEMO_LEAGUE_CODE, 1, 38)}
              >
                Try a demo league
              </Button>
              <p className="text-xs text-muted-foreground">
                No league ID handy? See what the tool looks like with sample data.
              </p>
            </div>
          )}

          <DonationSection />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Index;
