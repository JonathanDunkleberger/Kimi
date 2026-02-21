import { createClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';
import { useMemo } from 'react';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Public client (no auth — for reading public data like matches, prop_lines, leaderboard)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authenticated client hook (uses Clerk session token for RLS)
export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          // Get a Supabase-compatible JWT from Clerk
          const clerkToken = await session?.getToken({
            template: 'supabase',
          });

          const headers = new Headers(options?.headers);
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`);
          }

          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [session]);
}
