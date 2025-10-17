import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function fetchLeagueStandings(leagueCode: string, page: number = 1) {
  const response = await fetch(
    `https://fantasy.premierleague.com/api/leagues-classic/${leagueCode}/standings/?page_standings=${page}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch league data: ${response.statusText}`);
  }
  
  return await response.json();
}

async function fetchEntryHistory(entryId: number) {
  const response = await fetch(
    `https://fantasy.premierleague.com/api/entry/${entryId}/history/`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch entry history for ${entryId}`);
  }
  
  return await response.json();
}

async function fetchGameweekPicks(entryId: number, gameweek: number) {
  const response = await fetch(
    `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gameweek}/picks/`
  );
  
  if (!response.ok) {
    return null; // Return null if picks not available
  }
  
  return await response.json();
}

async function fetchBootstrapStatic() {
  const response = await fetch(
    `https://fantasy.premierleague.com/api/bootstrap-static/`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch bootstrap static data`);
  }
  
  return await response.json();
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

    // Fetch gameweek history and captain picks for each manager
    const managersWithHistory: Manager[] = [];
    
    for (const manager of allManagers) {
      try {
        const history = await fetchEntryHistory(manager.entry);
        const gameweekPoints: { [key: string]: number } = {};
        const captainPicks: CaptainPick[] = [];
        
        // Build gameweek points map
        const gameweekPointsMap = new Map(
          history.current.map((event: any) => [event.event, event.points])
        );
        
        for (const event of history.current) {
          const gw = event.event;
          if (gw >= startGW && gw <= endGW) {
            gameweekPoints[gw] = event.points;
          }
        }
        
        // Fetch captain picks for each gameweek
        for (let gw = startGW; gw <= endGW; gw++) {
          try {
            const picks = await fetchGameweekPicks(manager.entry, gw);
            if (picks && picks.picks) {
              const captainPick = picks.picks.find((p: any) => p.is_captain);
              const viceCaptainPick = picks.picks.find((p: any) => p.is_vice_captain);
              
              if (captainPick && viceCaptainPick) {
                // Get player names from bootstrap data
                const captainName = String(playersMap.get(captainPick.element) || 'Unknown');
                const viceCaptainName = String(playersMap.get(viceCaptainPick.element) || 'Unknown');
                
                // Get element history for this gameweek to find points
                const captainPoints = picks.entry_history?.points || 0;
                const viceCaptainPoints = picks.entry_history?.points || 0;
                
                captainPicks.push({
                  gameweek: gw,
                  captain: captainName,
                  captain_points: Math.floor(captainPoints / captainPick.multiplier), // Base points
                  vice_captain: viceCaptainName,
                  vice_captain_points: viceCaptainPoints,
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching picks for entry ${manager.entry} GW${gw}:`, error);
          }
        }
        
        // Filter chips within the gameweek range
        const chipsInRange = (history.chips || [])
          .filter((chip: Chip) => chip.event >= startGW && chip.event <= endGW);
        
        managersWithHistory.push({
          rank: manager.rank,
          entry: manager.entry,
          entry_name: manager.entry_name,
          player_name: manager.player_name,
          total: manager.total,
          gameweek_points: gameweekPoints,
          chips: chipsInRange,
          captains: captainPicks,
        });
      } catch (error) {
        console.error(`Error fetching history for entry ${manager.entry}:`, error);
      }
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
