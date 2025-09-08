import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*, team_a:team_a_id(name, logo_url), team_b:team_b_id(name, logo_url)")
    .order("start_time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ matches });
}
