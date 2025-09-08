import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { name, team_id } = req.body as { name: string; team_id?: string };
  if (!name) return res.status(400).json({ error: "name required" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.from("players").insert({ name, team_id: team_id ?? null }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ player: data });
}
