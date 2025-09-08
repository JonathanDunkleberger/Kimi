import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

// Payload: { stake: number, legs: [{ line_id: string, side: 'OVER'|'UNDER' }] }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createPagesServerClient({ req, res });
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const { stake, legs } = req.body || {};
  if (!stake || !Array.isArray(legs) || legs.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  // Validate legs structure
  for (const l of legs) {
    if (!l.line_id || !["OVER","UNDER"].includes(l.side)) {
      return res.status(400).json({ error: "Invalid leg" });
    }
  }
  try {
    // Fetch user credits
    const { data: userRow, error: uErr } = await supabase.from('users').select('id, credits').eq('id', user.id).single();
    if (uErr || !userRow) return res.status(400).json({ error: 'User record missing' });
    if (userRow.credits < stake) return res.status(400).json({ error: 'Insufficient credits' });

    // Deduct credits atomically via RPC
    const { error: decErr } = await supabase.rpc('deduct_credits', { p_user_id: user.id, p_amount: stake });
    if (decErr) return res.status(400).json({ error: decErr.message });

    const payout_rule = legs.length === 3 ? '3LEG_5X' : legs.length === 2 ? '2LEG_3X' : '1LEG_2X';
    const { data: entry, error: insErr } = await supabase.from('entries').insert({
      user_id: user.id,
      stake,
      payout_rule,
      legs_json: legs,
      status: 'OPEN'
    }).select('*').single();
    if (insErr) return res.status(400).json({ error: insErr.message });

    res.status(200).json({ entry });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
