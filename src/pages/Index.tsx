import { useState } from "react";
import { Header } from "@/components/Header";
import { LeagueForm } from "@/components/LeagueForm";
import { DataDisplay } from "@/components/DataDisplay";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface Chip {
  name: string;
  time: string;
  event: number;
}

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
  chips: Chip[];
  captains: CaptainPick[];
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
          
          {/* About Section */}
          <section className="mt-12 border-t border-border pt-8">
            <div className="max-w-2xl mx-auto text-center space-y-3">
              <h2 className="font-heading text-xl font-semibold">About FPL Data Fetcher</h2>
              <p className="text-muted-foreground">
                FPL Data Fetcher lets you instantly view Fantasy Premier League standings for any mini-league. Simply enter your league ID to fetch live rankings, manager points, and more — fast, clean, and accurate.
              </p>
            </div>
          </section>

          {/* Support Section */}
          <section className="mt-8 border-t border-border pt-8">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h2 className="font-heading text-lg font-semibold">Support the Project 💖</h2>
              <p className="text-sm text-muted-foreground">
                If you find FPL Data Fetcher helpful, you can support future improvements through crypto donations:
              </p>
              
              <div className="space-y-3 mt-4">
                {/* ETH / Base / BSC Address */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    ETH / Base / BSC:
                  </span>
                  <code className="text-xs break-all sm:break-normal px-2 py-1 bg-background rounded">
                    0x1035063FfA2102A2f770F628Dc1062FD3413bBE8
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("0x1035063FfA2102A2f770F628Dc1062FD3413bBE8");
                      toast.success("ETH address copied to clipboard!");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy ETH address"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                {/* Solana Address */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Solana:
                  </span>
                  <code className="text-xs break-all sm:break-normal px-2 py-1 bg-background rounded">
                    Ab4RAnmemuSXFhaqSXJbpC5frdmkR5my7kBT2wHNFAFN
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("Ab4RAnmemuSXFhaqSXJbpC5frdmkR5my7kBT2wHNFAFN");
                      toast.success("Solana address copied to clipboard!");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy Solana address"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Index;
