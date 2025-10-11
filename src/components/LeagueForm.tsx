import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Search, Loader2, X, AlertCircle } from "lucide-react";

interface LeagueFormProps {
  onFetch: (leagueCode: string, startGW: number, endGW: number) => Promise<void>;
  onDownload: (leagueCode: string, startGW: number, endGW: number) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

export const LeagueForm = ({ onFetch, onDownload, isLoading, onCancel }: LeagueFormProps) => {
  const [leagueCode, setLeagueCode] = useState("");
  const [startGW, setStartGW] = useState(1);
  const [endGW, setEndGW] = useState(38);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    await onFetch(leagueCode, startGW, endGW);
  };

  const handleDownload = async () => {
    await onDownload(leagueCode, startGW, endGW);
  };

  const isValid = leagueCode.trim() !== "" && startGW >= 1 && endGW <= 38 && startGW <= endGW;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Enter League Details</CardTitle>
        <CardDescription>
          Enter your FPL league ID and select the gameweek range to analyze
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool only processes leagues with 150 managers or fewer due to API rate limits.
          </AlertDescription>
        </Alert>
        <form onSubmit={handleFetch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leagueCode">League ID</Label>
            <Input
              id="leagueCode"
              type="text"
              placeholder="Enter league code"
              value={leagueCode}
              onChange={(e) => setLeagueCode(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs sm:text-sm text-muted-foreground break-words">
              Find your FPL league ID in your league's URL — it's the number between /leagues/ and /standings (for example, in https://fantasy.premierleague.com/leagues/123456/standings, the league ID is 123456).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startGW">Start Gameweek</Label>
              <Input
                id="startGW"
                type="number"
                min="1"
                max="38"
                value={startGW}
                onChange={(e) => setStartGW(Number(e.target.value))}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endGW">End Gameweek</Label>
              <Input
                id="endGW"
                type="number"
                min="1"
                max="38"
                value={endGW}
                onChange={(e) => setEndGW(Number(e.target.value))}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Display Data
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={!isValid || isLoading}
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>

            {isLoading && (
              <Button
                type="button"
                variant="destructive"
                onClick={onCancel}
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
