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

  const { match_id, player_id, prop_type_name, line_value, over_odds, under_odds } = req.body;
  if (!match_id || !player_id || !prop_type_name || line_value == null) {
    return res.status(400).json({ error: 'match_id, player_id, prop_type_name, and line_value are required' });
  }

  // Find or create prop_type
  let { data: propType } = await supabaseAdmin
    .from('prop_types')
    .select('id')
    .eq('name', prop_type_name)
    .single();

  if (!propType) {
    const { data: newPt, error: ptErr } = await supabaseAdmin
      .from('prop_types')
      .insert({ name: prop_type_name, stat_key: prop_type_name.toLowerCase().replace(/\s+/g, '_') })
      .select()
      .single();
    if (ptErr) return res.status(500).json({ error: ptErr.message });
    propType = newPt;
  }

  const { data, error } = await supabaseAdmin.from('prop_lines').insert({
    match_id,
    player_id,
    prop_type_id: propType!.id,
    line_value: parseFloat(line_value),
    status: 'OPEN',
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
