import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry with exponential backoff
async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3,
  timeout = 10000
): Promise<T> {
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
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (attempt === maxRetries) throw new Error(`Failed after ${maxRetries + 1} attempts: ${error.message}`);
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise((resolve) => setTimeout(resolve, delay));
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
  return fetchWithRetry(`https://fantasy.premierleague.com/api/bootstrap-static/`);
}

// Create Supabase client using environment vars available in Edge Function
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { 'x-edge-function': 'true' } } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === 'GET'
      ? Object.fromEntries(new URL(req.url).searchParams.entries())
      : await req.json();

    const leagueCode = body.leagueCode || body.league || body.id || body.league_id;
    const startGW = Number(body.startGW || body.start_gw || body.start || 1);
    const endGW = Number(body.endGW || body.end_gw || body.end || 38);

    if (!leagueCode) {
      return new Response(JSON.stringify({ error: 'leagueCode required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Fetching league ${leagueCode} from GW${startGW} to GW${endGW}`);

    // Determine TTL dynamically by checking bootstrap-static
    const bootstrapData = await fetchBootstrapStatic();
    const currentEvent = (bootstrapData?.events || []).find((e: any) => e.is_current === true) || null;
    const isLive = currentEvent ? !currentEvent.finished : false;
    const TTL_SECONDS = isLive ? 60 : 15 * 60;

    // Try to read cache from Supabase
    const { data: cachedRows, error: selectError } = await supabase
      .from('league_cache')
      .select('*')
      .eq('league_id', String(leagueCode))
      .eq('start_gw', startGW)
      .eq('end_gw', endGW)
      .limit(1)
      .maybeSingle();

    if (selectError) console.error('Supabase select error:', selectError.message || selectError);

    const now = new Date();

    if (cachedRows && cachedRows.fetched_at) {
      const fetchedAt = new Date(cachedRows.fetched_at);
      const ageSeconds = (now.getTime() - fetchedAt.getTime()) / 1000;
      if (ageSeconds <= TTL_SECONDS) {
        // Update last_queried_at
        await supabase.from('league_cache').update({ last_queried_at: now.toISOString() })
          .eq('league_id', String(leagueCode)).eq('start_gw', startGW).eq('end_gw', endGW);

        console.log(`Serving cached payload for ${leagueCode} (age ${Math.round(ageSeconds)}s)`);
        return new Response(JSON.stringify(cachedRows.payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // If missing or stale, fetch fresh data from FPL API (existing logic)
    // Fetch all pages of league standings
    let allManagers: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const standings = await fetchLeagueStandings(String(leagueCode), page);
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

    // Build players map from bootstrap data
    const playersMap = new Map((bootstrapData.elements || []).map((player: any) => [player.id, `${player.web_name}`]));

    // Get the real current FPL gameweek from bootstrap data
    const currentGameweek = bootstrapData.current_event || bootstrapData.current_event_id || 0;

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
            (_, idx) => startGW + idx
          );

          const picksResults = await Promise.allSettled(
            gameweeks.map((gw) => fetchGameweekPicks(manager.entry, gw))
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
          const chipsInRange = (history.chips || []).filter((chip: Chip) => chip.event >= startGW && chip.event <= endGW);

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
          managersWithHistory.push(result.value as Manager);
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
        gameweekChampions.push({ gameweek: gw, champions });
      }
    }

    const payload = {
      leagueData: managersWithHistory,
      gameweekChampions,
      currentGameweek,
    };

    // Upsert into Supabase cache table
    const upsertRecord = {
      league_id: String(leagueCode),
      start_gw: startGW,
      end_gw: endGW,
      payload,
      fetched_at: new Date().toISOString(),
      last_queried_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from('league_cache').upsert(upsertRecord, { onConflict: ['league_id', 'start_gw', 'end_gw'] });
    if (upsertError) console.error('Supabase upsert error:', upsertError.message || upsertError);

    // Optionally insert a league_history snapshot for completed gameweeks
    try {
      const gameweekToSnapshot = payload.currentGameweek;
      if (gameweekToSnapshot && Number.isInteger(gameweekToSnapshot)) {
        // Check if history already exists
        const { data: existingHistory, error: historySelectError } = await supabase
          .from('league_history')
          .select('*')
          .eq('league_id', String(leagueCode))
          .eq('gameweek', gameweekToSnapshot)
          .limit(1)
          .maybeSingle();

        if (!existingHistory && !historySelectError) {
          const { error: histInsertError } = await supabase.from('league_history').insert({ league_id: String(leagueCode), gameweek: gameweekToSnapshot, standings_snapshot: payload, created_at: new Date().toISOString() });
          if (histInsertError) console.error('Failed to insert league_history:', histInsertError.message || histInsertError);
        }
      }
    } catch (err) {
      console.error('league_history insert failed:', err);
    }

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
        currentGameweek,
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
