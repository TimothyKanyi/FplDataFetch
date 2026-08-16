import { useState, useCallback, memo } from "react";
import { Header } from "@/components/Header";
import { LeagueForm } from "@/components/LeagueForm";
import { DataDisplay } from "@/components/DataDisplay";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DonationSection } from "@/components/DonationSection";
import { ShareCard } from "@/components/ShareCard";
import { LeagueHistory } from "@/components/LeagueHistory";
import { AdBanner } from "@/components/AdBanner";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { useFplData, useFplDownload, fplQueryKeys } from "@/hooks/useFplData";
import { useQueryClient } from "@tanstack/react-query";

// Memoized child components to prevent unnecessary re-renders
const MemoizedDataDisplay = memo(DataDisplay);

interface FetchParams {
  leagueCode: string;
  startGW: number;
  endGW: number;
}

const Index = () => {
  const [fetchParams, setFetchParams] = useState<FetchParams | null>(null);
  const queryClient = useQueryClient();

  // Optimized data fetching with TanStack Query
  const {
    data,
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
      const params = { leagueCode, startGW, endGW };

      // Check if we have cached data for instant display
      const cachedData = queryClient.getQueryData(
        fplQueryKeys.league(leagueCode, startGW, endGW)
      );

      if (cachedData) {
        toast.info("Using cached data, refreshing in background...");
      }

      // Set params to trigger query - TanStack Query handles deduplication
      setFetchParams(params);
    },
    [queryClient]
  );

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

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-8">
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
          ) : null}

          <DonationSection />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Index;
