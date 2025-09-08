import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createPagesServerClient({ req, res });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const { selections, wager } = req.body as { selections: { prop_line_id: string; choice: "over" | "under" }[]; wager: number };
  if (!Array.isArray(selections) || selections.length === 0 || !wager) return res.status(400).json({ error: "Invalid payload" });

  const { data, error } = await supabase.from("user_bets").insert(
    selections.map((s) => ({ user_id: user.id, prop_line_id: s.prop_line_id, selection: s.choice, wager }))
  );
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ ok: true });
}
