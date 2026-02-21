import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/sync-user
 *
 * Ensures the currently signed-in Clerk user has a corresponding row in
 * the Supabase `users` table.  Called by the client the first time a
 * signed-in user has no Supabase profile (covers cases where the Clerk
 * webhook hasn't fired yet or was missed).
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if user already exists
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (existing) {
    return res.status(200).json({ synced: false, reason: 'already_exists' });
  }

  // Derive a display name from the request body or fall back
  const { username } = req.body || {};
  const displayName = username || 'Player';

  const emojis = ['🎯', '🔥', '👻', '🐍', '💨', '💚', '🎮', '⚡', '🦊', '🐺'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  const { error } = await supabaseAdmin.from('users').upsert({
    id: userId,
    username: displayName,
    avatar_emoji: randomEmoji,
    balance: 10000,
    wins: 0,
    losses: 0,
    current_streak: 0,
    total_wagered: 0,
    total_won: 0,
  });

  if (error) {
    console.error('Error syncing user:', error);
    return res.status(500).json({ error: 'Failed to sync user' });
  }

  return res.status(200).json({ synced: true });
}
