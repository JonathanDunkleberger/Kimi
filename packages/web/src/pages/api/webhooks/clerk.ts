import type { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Disable Next.js body parsing — we need the raw body for signature verification
export const config = {
  api: { bodyParser: false },
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Read raw body
  const rawBody = (await buffer(req)).toString();

  // Verify signature
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(rawBody, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Verification failed' });
  }

  // Handle user.created
  if (evt.type === 'user.created') {
    const { id, username, email_addresses } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const displayName = username || email?.split('@')[0] || 'Player';

    const emojis = ['🎯', '🔥', '👻', '🐍', '💨', '💚', '🎮', '⚡', '🦊', '🐺'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const { error } = await supabaseAdmin.from('users').upsert({
      id,
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
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Error creating user' });
    }
  }

  // Handle user.deleted
  if (evt.type === 'user.deleted') {
    const { id } = evt.data;
    if (id) {
      await supabaseAdmin.from('users').delete().eq('id', id);
    }
  }

  return res.status(200).json({ received: true });
}
