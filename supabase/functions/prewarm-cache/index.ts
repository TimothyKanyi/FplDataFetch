import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Simple fetch with retry helper
async function fetchWithRetry<T>(url: string, maxRetries = 3, timeout = 10000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('failed');
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Reserved demo league ID. The prewarm cron explicitly skips this ID so the
// seeded demo payload is never overwritten with real/empty FPL data.
const DEMO_LEAGUE_CODE = "demo-league-001";

serve(async (req) => {
  // Allow cron or manual trigger
  try {
    // Query most recently queried leagues
    const { data: leagues, error } = await supabase
      .from('league_cache')
      .select('league_id,start_gw,end_gw')
      .order('last_queried_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching league_cache list:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!leagues || !leagues.length) {
      return new Response(JSON.stringify({ message: 'No leagues to prewarm' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // For each league, fetch fresh data and upsert
    for (const l of leagues) {
      if (l.league_id === DEMO_LEAGUE_CODE) {
        console.log(`Skipping demo league ${DEMO_LEAGUE_CODE}`);
        continue;
      }
      try {
        const leagueCode = l.league_id;
        const startGW = l.start_gw || 1;
        const endGW = l.end_gw || 38;

        // Fetch bootstrap
        const bootstrap = await fetchWithRetry<any>('https://fantasy.premierleague.com/api/bootstrap-static/');
        const currentGameweek = bootstrap.current_event || bootstrap.current_event_id || 0;
        const currentEvent = (bootstrap?.events || []).find((e: any) => e.is_current === true) || null;
        const isLive = currentEvent ? !currentEvent.finished : false;
        const deadlineTime = currentEvent?.deadline_time ?? null;

        // Fetch standings pages
        let allManagers: any[] = [];
        let leagueName = "";
        let page = 1;
        let hasNext = true;
        while (hasNext) {
          const s = await fetchWithRetry<any>(`https://fantasy.premierleague.com/api/leagues-classic/${leagueCode}/standings/?page_standings=${page}`);
          if (!leagueName && s?.league?.name) {
            leagueName = s.league.name;
          }
          allManagers = allManagers.concat(s.standings.results);
          hasNext = s.standings.has_next;
          page++;
          if (page > 100) break;
        }

        if (allManagers.length > 150) {
          console.warn(`Skipping prewarm for ${leagueCode}: too many managers (${allManagers.length})`);
          continue;
        }

        const managersWithHistory: any[] = [];
        const BATCH = 10;
        for (let i = 0; i < allManagers.length; i += BATCH) {
          const batch = allManagers.slice(i, i + BATCH);
          const results = await Promise.allSettled(batch.map(async (mgr) => {
            const history = await fetchWithRetry<any>(`https://fantasy.premierleague.com/api/entry/${mgr.entry}/history/`);
            const gameweekPoints: any = {};
            for (const ev of history.current) {
              const gw = ev.event;
              if (gw >= startGW && gw <= endGW) gameweekPoints[gw] = ev.points;
            }
            const gameweeks = Array.from({ length: endGW - startGW + 1 }, (_, idx) => startGW + idx);
            const picksResults = await Promise.allSettled(gameweeks.map(gw => fetchWithRetry(`https://fantasy.premierleague.com/api/entry/${mgr.entry}/event/${gw}/picks/`).catch(()=>null)));
            const transfers: any[] = [];
            picksResults.forEach((r, idx) => {
              if (r && (r as any).entry_history) {
                transfers.push({ gameweek: gameweeks[idx], transfers_made: (r as any).entry_history.event_transfers || 0, transfer_cost: (r as any).entry_history.event_transfers_cost || 0, points: (r as any).entry_history.points || 0 });
              }
            });
            const chips = (history.chips || []).filter((c:any)=>c.event>=startGW && c.event<=endGW);
            return { rank: mgr.rank, entry: mgr.entry, entry_name: mgr.entry_name, player_name: mgr.player_name, total: mgr.total, gameweek_points: gameweekPoints, chips, transfers, last_rank: mgr.last_rank ?? null };
          }));

          results.forEach(r => { if (r.status === 'fulfilled') managersWithHistory.push((r as any).value); });
        }

        const gameweekChampions: any[] = [];
        for (let gw = startGW; gw <= endGW; gw++) {
          let max = 0; const champs:any[] = [];
          for (const m of managersWithHistory) {
            const pts = m.gameweek_points[gw]||0;
            if (pts>max) { max=pts; champs.length=0; champs.push({ player_name: m.player_name, entry_name: m.entry_name, points: pts }); }
            else if (pts===max && pts>0) champs.push({ player_name: m.player_name, entry_name: m.entry_name, points: pts });
          }
          if (champs.length) gameweekChampions.push({ gameweek: gw, champions: champs });
        }

        const payload = { leagueData: managersWithHistory, gameweekChampions, currentGameweek, leagueName, isLive, deadlineTime, fetchedAt: new Date().toISOString() };

        // Upsert cache
        await supabase.from('league_cache').upsert({ league_id: String(leagueCode), start_gw: startGW, end_gw: endGW, payload, fetched_at: new Date().toISOString(), last_queried_at: new Date().toISOString() }, { onConflict: ['league_id','start_gw','end_gw'] });

        // Write history snapshot once per COMPLETED gameweek (never the live one)
        const finishedEvents = (bootstrap?.events || []).filter((e: any) => e.finished === true);
        const lastCompletedGameweek = finishedEvents.length
          ? Math.max(...finishedEvents.map((e: any) => e.id))
          : 0;
        if (lastCompletedGameweek && Number.isInteger(lastCompletedGameweek)) {
          const { data: existing } = await supabase.from('league_history').select('id').eq('league_id', String(leagueCode)).eq('gameweek', lastCompletedGameweek).limit(1).maybeSingle();
          if (!existing) {
            await supabase.from('league_history').insert({ league_id: String(leagueCode), gameweek: lastCompletedGameweek, standings_snapshot: payload, created_at: new Date().toISOString() });
          }
        }

      } catch (err) {
        console.error('Error prewarming league', l, err);
        continue;
      }
    }

    return new Response(JSON.stringify({ message: 'Prewarm complete' }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err:any) {
    console.error('Prewarm failed', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
