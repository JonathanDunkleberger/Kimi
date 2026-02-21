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

  const { name, abbrev, logo_url, color, region, game } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name is required' });

  const { data, error } = await supabaseAdmin.from('teams').insert({
    name,
    abbrev: abbrev || name.substring(0, 3).toUpperCase(),
    logo_url: logo_url || null,
    color: color || '#00e5a0',
    region: region || null,
    game: game || 'valorant',
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
