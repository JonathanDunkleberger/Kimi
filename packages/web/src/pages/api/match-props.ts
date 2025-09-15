import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const match_id = typeof req.query.match_id === "string" ? req.query.match_id : undefined;
  if (!match_id) return res.status(400).json({ error: "match_id required" });

  const { data, error } = await supabase
    .from("prop_lines")
    .select("id, line_value, status, players:player_id(name), prop_types:prop_type_id(name)")
    .eq("match_id", match_id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const lines = (data || []).map((r: any) => ({
    id: r.id as string,
    player: r.players?.name as string,
    prop: r.prop_types?.name as string,
    line: Number(r.line_value),
    status: r.status as string,
  }));

  res.status(200).json({ lines });
}
