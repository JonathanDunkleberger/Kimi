import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, PropLine, LeaderboardUser, Entry, Game } from '@/types';

export function useMatches(game?: Game) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      let query = supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(*),
          team_b:teams!matches_team_b_id_fkey(*),
          event:events(*)
        `)
        .in('status', ['SCHEDULED', 'upcoming', 'live'])
        .order('start_time', { ascending: true });

      if (game) {
        query = query.eq('game', game);
      }

      const { data } = await query;
      setMatches((data as Match[]) || []);
      setLoading(false);
    }
    fetch();
  }, [game]);

  return { matches, loading };
}

export function usePropLines(matchId: string | undefined) {
  const [propLines, setPropLines] = useState<PropLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!matchId) return;
      const { data } = await supabase
        .from('prop_lines')
        .select(`
          *,
          player:players!inner(*, team:teams(*)),
          prop_type:prop_types(name, stat_key)
        `)
        .eq('match_id', matchId)
        .in('status', ['OPEN', 'open'])
        .order('player_id');
      setPropLines((data as PropLine[]) || []);
      setLoading(false);
    }
    fetch();
  }, [matchId]);

  return { propLines, loading };
}

export function useAllPropLines(matchIds: string[]) {
  const [propLines, setPropLines] = useState<PropLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (matchIds.length === 0) {
        setPropLines([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('prop_lines')
        .select(`
          *,
          player:players!inner(*, team:teams(*)),
          prop_type:prop_types(name, stat_key)
        `)
        .in('match_id', matchIds)
        .in('status', ['OPEN', 'open'])
        .order('player_id');
      setPropLines((data as PropLine[]) || []);
      setLoading(false);
    }
    fetch();
  }, [matchIds.join(',')]);

  return { propLines, loading };
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(50);
      setLeaderboard((data as LeaderboardUser[]) || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return { leaderboard, loading };
}

export function useMyEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('entries')
        .select(`
          *,
          entry_legs(
            *,
            prop_line:prop_lines(
              *,
              player:players(name, ign, team_id),
              prop_type:prop_types(name, stat_key)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      setEntries((data as Entry[]) || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return { entries, loading };
}
