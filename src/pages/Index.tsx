import { useState } from "react";
import { Header } from "@/components/Header";
import { LeagueForm } from "@/components/LeagueForm";
import { DataDisplay } from "@/components/DataDisplay";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleFetch = async (leagueCode: string, startGW: number, endGW: number) => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    setLeagueData(null);
    setGameweekChampions(null);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-league-data", {
        body: { leagueCode, startGW, endGW },
      });

      if (error) throw error;

      if (data) {
        setLeagueData(data.leagueData);
        setGameweekChampions(data.gameweekChampions);
        toast.success("Data fetched successfully!");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data. Please check the league code and try again.");
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
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
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error downloading CSV:", error);
        toast.error("Failed to generate CSV file. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
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
            onCancel={handleCancel}
          />
          <DataDisplay leagueData={leagueData} gameweekChampions={gameweekChampions} />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Index;
