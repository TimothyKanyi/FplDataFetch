import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// Retry with exponential backoff
async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3,
  timeout = 10000
): Promise<T> {
  const cacheKey = `fetch:${url}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429 || response.status === 503) {
          // Rate limited or service unavailable - wait and retry
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCache(cacheKey, data);
      return data;
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Fetch failed');
}

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

async function fetchLeagueStandings(leagueCode: string, page: number = 1): Promise<any> {
  return fetchWithRetry(
    `https://fantasy.premierleague.com/api/leagues-classic/${leagueCode}/standings/?page_standings=${page}`
  );
}

async function fetchEntryHistory(entryId: number): Promise<any> {
  return fetchWithRetry(
    `https://fantasy.premierleague.com/api/entry/${entryId}/history/`
  );
}

async function fetchGameweekPicks(entryId: number, gameweek: number): Promise<any> {
  try {
    return await fetchWithRetry(
      `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gameweek}/picks/`
    );
  } catch {
    return null; // Return null if picks not available
  }
}

async function fetchBootstrapStatic(): Promise<any> {
  return fetchWithRetry(
    `https://fantasy.premierleague.com/api/bootstrap-static/`
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leagueCode, startGW, endGW } = await req.json();
    
    console.log(`Fetching league ${leagueCode} from GW${startGW} to GW${endGW}`);

    // Fetch all pages of league standings
    let allManagers: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const standings = await fetchLeagueStandings(leagueCode, page);
      allManagers = allManagers.concat(standings.standings.results);
      hasNextPage = standings.standings.has_next;
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 100) break;
    }

    console.log(`Fetched ${allManagers.length} managers`);

    // Limit to 150 managers to prevent API rate limiting and timeouts
    if (allManagers.length > 150) {
      return new Response(
        JSON.stringify({ error: `League has ${allManagers.length} managers. This tool only supports leagues with 150 managers or fewer.` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch bootstrap static data (player info)
    const bootstrapData = await fetchBootstrapStatic();
    const playersMap = new Map(
      bootstrapData.elements.map((player: any) => [
        player.id,
        `${player.web_name}`
      ])
    );

    // Fetch gameweek history and transfer data for all managers in parallel
    const managersWithHistory: Manager[] = [];
    
    // Process managers in parallel batches of 10 to avoid overwhelming the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < allManagers.length; i += BATCH_SIZE) {
      const batch = allManagers.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map(async (manager) => {
          const history = await fetchEntryHistory(manager.entry);
          const gameweekPoints: { [key: string]: number } = {};
          
          // Build gameweek points map
          for (const event of history.current) {
            const gw = event.event;
            if (gw >= startGW && gw <= endGW) {
              gameweekPoints[gw] = event.points;
            }
          }
          
          // Fetch transfer data for all gameweeks in parallel
          const gameweeks = Array.from(
            { length: endGW - startGW + 1 },
            (_, i) => startGW + i
          );
          
          const picksResults = await Promise.allSettled(
            gameweeks.map(gw => fetchGameweekPicks(manager.entry, gw))
          );
          
          const transferData: TransferData[] = [];
          picksResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value?.entry_history) {
              transferData.push({
                gameweek: gameweeks[index],
                transfers_made: result.value.entry_history.event_transfers || 0,
                transfer_cost: result.value.entry_history.event_transfers_cost || 0,
                points: result.value.entry_history.points || 0,
              });
            }
          });
          
          // Filter chips within the gameweek range
          const chipsInRange = (history.chips || [])
            .filter((chip: Chip) => chip.event >= startGW && chip.event <= endGW);
          
          return {
            rank: manager.rank,
            entry: manager.entry,
            entry_name: manager.entry_name,
            player_name: manager.player_name,
            total: manager.total,
            gameweek_points: gameweekPoints,
            chips: chipsInRange,
            transfers: transferData,
          };
        })
      );
      
      // Add successful results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          managersWithHistory.push(result.value);
        } else {
          console.error('Manager fetch failed:', result.reason);
        }
      });
      
      console.log(`Processed ${Math.min(i + BATCH_SIZE, allManagers.length)} of ${allManagers.length} managers`);
    }

    // Calculate gameweek champions
    const gameweekChampions: GameweekChampion[] = [];
    
    for (let gw = startGW; gw <= endGW; gw++) {
      let maxPoints = 0;
      const champions: { player_name: string; entry_name: string; points: number }[] = [];
      
      for (const manager of managersWithHistory) {
        const points = manager.gameweek_points[gw] || 0;
        
        if (points > maxPoints) {
          maxPoints = points;
          champions.length = 0;
          champions.push({
            player_name: manager.player_name,
            entry_name: manager.entry_name,
            points,
          });
        } else if (points === maxPoints && points > 0) {
          champions.push({
            player_name: manager.player_name,
            entry_name: manager.entry_name,
            points,
          });
        }
      }
      
      if (champions.length > 0) {
        gameweekChampions.push({
          gameweek: gw,
          champions,
        });
      }
    }

    return new Response(
      JSON.stringify({
        leagueData: managersWithHistory,
        gameweekChampions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in fetch-league-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
