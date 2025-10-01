import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
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

function escapeCSV(value: any): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leagueCode, startGW, endGW } = await req.json();
    
    console.log(`Generating Excel for league ${leagueCode} from GW${startGW} to GW${endGW}`);

    // Fetch all pages of league standings
    let allManagers: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const standings = await fetchLeagueStandings(leagueCode, page);
      allManagers = allManagers.concat(standings.standings.results);
      hasNextPage = standings.standings.has_next;
      page++;
      
      if (page > 100) break;
    }

    // Fetch gameweek history for each manager
    const managersWithHistory: Manager[] = [];
    
    for (const manager of allManagers) {
      try {
        const history = await fetchEntryHistory(manager.entry);
        const gameweekPoints: { [key: string]: number } = {};
        
        for (const event of history.current) {
          const gw = event.event;
          if (gw >= startGW && gw <= endGW) {
            gameweekPoints[gw] = event.points;
          }
        }
        
        managersWithHistory.push({
          rank: manager.rank,
          entry: manager.entry,
          entry_name: manager.entry_name,
          player_name: manager.player_name,
          total: manager.total,
          gameweek_points: gameweekPoints,
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

    // Generate CSV content for both sheets
    const gameweeks = Array.from({ length: endGW - startGW + 1 }, (_, i) => startGW + i);
    
    // Sheet 1: League Standings CSV
    let leagueCSV = 'Rank,Manager,Team Name,Total Points,' + gameweeks.map(gw => `GW${gw}`).join(',') + '\n';
    
    for (const manager of managersWithHistory) {
      const row = [
        manager.rank,
        escapeCSV(manager.player_name),
        escapeCSV(manager.entry_name),
        manager.total,
        ...gameweeks.map(gw => manager.gameweek_points[gw] || 0),
      ].join(',');
      leagueCSV += row + '\n';
    }

    // Sheet 2: Gameweek Champions CSV
    let championsCSV = 'Gameweek,Manager(s),Team Name(s),Points\n';
    
    for (const gw of gameweekChampions) {
      const managers = gw.champions.map(c => c.player_name).join('; ');
      const teams = gw.champions.map(c => c.entry_name).join('; ');
      championsCSV += `GW${gw.gameweek},${escapeCSV(managers)},${escapeCSV(teams)},${gw.champions[0].points}\n`;
    }

    // Combine both CSVs with a separator
    const combinedCSV = `League Standings\n${leagueCSV}\n\nGameweek Champions\n${championsCSV}`;

    // Convert to base64
    const base64 = btoa(unescape(encodeURIComponent(combinedCSV)));

    return new Response(
      JSON.stringify({
        fileUrl: `data:text/csv;charset=utf-8;base64,${base64}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-excel:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
