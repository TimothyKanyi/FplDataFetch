import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const leagueId = url.searchParams.get("leagueId") || url.searchParams.get("league_id") || url.searchParams.get("id");
    const gameweekParam = url.searchParams.get("gameweek");
    const gameweek = gameweekParam ? Number(gameweekParam) : 0;

    if (!leagueId) {
      return new Response(JSON.stringify({ error: 'leagueId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single gameweek snapshot requested
    if (gameweek && Number.isInteger(gameweek)) {
      const { data, error } = await supabase
        .from('league_history')
        .select('gameweek, standings_snapshot, created_at')
        .eq('league_id', String(leagueId))
        .eq('gameweek', gameweek)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          snapshot: data?.standings_snapshot ?? null,
          created_at: data?.created_at ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise list available gameweeks (most recent first)
    const { data, error } = await supabase
      .from('league_history')
      .select('gameweek, created_at')
      .eq('league_id', String(leagueId))
      .order('gameweek', { ascending: false })
      .limit(50);

    if (error) throw error;

    return new Response(JSON.stringify({ gameweeks: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in get-league-history:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
