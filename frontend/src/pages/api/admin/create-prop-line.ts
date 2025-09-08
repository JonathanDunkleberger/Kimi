import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { match_id, player_id, prop_type_name, line_value, over_odds, under_odds } = req.body as {
    match_id: string; player_id: string; prop_type_name: string; line_value: number; over_odds?: number; under_odds?: number;
  };
  if (!match_id || !player_id || !prop_type_name || typeof line_value !== "number")
    return res.status(400).json({ error: "match_id, player_id, prop_type_name, line_value required" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Ensure prop type exists or create it
  const { data: pt, error: ptErr } = await supabase
    .from("prop_types")
    .upsert({ name: prop_type_name }, { onConflict: "name" })
    .select()
    .single();
  if (ptErr) return res.status(500).json({ error: ptErr.message });

  const { data, error } = await supabase
    .from("prop_lines")
    .insert({ match_id, player_id, prop_type_id: pt.id, line_value, over_odds, under_odds })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ prop_line: data });
}
