import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { team_a_id, team_b_id, start_time, game, game_mode, series_format, map } = req.body;
  if (!team_a_id || !team_b_id || !start_time) {
    return res.status(400).json({ error: 'team_a_id, team_b_id, and start_time are required' });
  }

  const { data, error } = await supabaseAdmin.from('matches').insert({
    team_a_id,
    team_b_id,
    start_time,
    status: 'upcoming',
    game: game || 'valorant',
    game_mode: game_mode || null,
    series_format: series_format || null,
    map: map || null,
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
