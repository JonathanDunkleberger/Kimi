import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { team_a_id, team_b_id, start_time, event_id } = req.body as { team_a_id: string; team_b_id: string; start_time: string; event_id?: string };
  if (!team_a_id || !team_b_id || !start_time) return res.status(400).json({ error: "team_a_id, team_b_id, start_time required" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.from("matches").insert({ team_a_id, team_b_id, start_time, event_id: event_id ?? null }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ match: data });
}
