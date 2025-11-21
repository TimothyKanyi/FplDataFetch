import { useState } from "react";
import { Header } from "@/components/Header";
import { LeagueForm } from "@/components/LeagueForm";
import { DataDisplay } from "@/components/DataDisplay";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DonationSection } from "@/components/DonationSection";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Chip {
  name: string;
  time: string;
  event: number;
}

interface TransferData {
  gameweek: number;
  transfers_made: number;
  transfer_cost: number;
  points: number;
}

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
  chips: Chip[];
  transfers: TransferData[];
}

interface GameweekChampion {
  gameweek: number;
  champions: {
    player_name: string;
    entry_name: string;
    points: number;
  }[];
}

const Index = () => {
  const [leagueData, setLeagueData] = useState<Manager[] | null>(null);
  const [gameweekChampions, setGameweekChampions] = useState<GameweekChampion[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load cached data on mount
  const loadCachedData = (leagueCode: string, startGW: number, endGW: number) => {
    const cacheKey = `fpl_${leagueCode}_${startGW}_${endGW}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        // Use cache if less than 5 minutes old
        if (age < 5 * 60 * 1000) {
          setLeagueData(data.leagueData);
          setGameweekChampions(data.gameweekChampions);
          return true;
        }
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }
    return false;
  };

  const handleFetch = async (leagueCode: string, startGW: number, endGW: number, useCache = true) => {
    const controller = new AbortController();
    setAbortController(controller);
    
    // Check for cached data
    const hasCachedData = useCache && loadCachedData(leagueCode, startGW, endGW);
    
    // Set loading states based on cache availability
    if (hasCachedData) {
      setIsRefreshing(true);
      toast.info("Loaded cached data, refreshing in background...");
    } else {
      setIsLoading(true);
      setLeagueData(null);
      setGameweekChampions(null);
    }

    try {
      const { data, error } = await supabase.functions.invoke("fetch-league-data", {
        body: { leagueCode, startGW, endGW },
      });

      if (error) throw error;

      // Only update if this request wasn't aborted
      if (!controller.signal.aborted && data) {
        setLeagueData(data.leagueData);
        setGameweekChampions(data.gameweekChampions);
        
        // Cache the successful response
        const cacheKey = `fpl_${leagueCode}_${startGW}_${endGW}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        if (!hasCachedData) {
          toast.success("Data fetched successfully!");
        }
        setRetryCount(0);
      }
    } catch (error: unknown) {
      // Only handle errors if not aborted
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      
      console.error("Error fetching data:", error);
      
      // If we have retry attempts left, suggest retry
      if (retryCount < 2) {
        toast.error("Failed to fetch data. Click 'Retry' to try again.", {
          action: {
            label: "Retry",
            onClick: () => {
              setRetryCount(prev => prev + 1);
              handleFetch(leagueCode, startGW, endGW, false);
            }
          }
        });
      } else {
        toast.error("Failed to fetch data after multiple attempts. Please try again later.");
        setRetryCount(0);
      }
    } finally {
      // Only update state if this controller is still active
      if (abortController === controller) {
        setIsLoading(false);
        setIsRefreshing(false);
        setAbortController(null);
      }
    }
  };

  const handleDownload = async (leagueCode: string, startGW: number, endGW: number) => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-excel", {
        body: { leagueCode, startGW, endGW },
      });

      if (error) throw error;

      if (data?.fileUrl) {
        // Download the file
        const link = document.createElement("a");
        link.href = data.fileUrl;
        link.download = `fpl_league_${leagueCode}_gw${startGW}-${endGW}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV file downloaded successfully!");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      
      console.error("Error downloading CSV:", error);
      toast.error("Failed to generate CSV file. Please try again.");
    } finally {
      if (abortController === controller) {
        setIsLoading(false);
        setAbortController(null);
      }
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
      toast.info("Operation cancelled");
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-8">
          <LeagueForm
            onFetch={handleFetch}
            onDownload={handleDownload}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onCancel={handleCancel}
          />
          {isLoading && !leagueData ? (
            <LoadingSkeleton />
          ) : (
            <DataDisplay leagueData={leagueData} gameweekChampions={gameweekChampions} />
          )}
          
          <DonationSection />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Index;
