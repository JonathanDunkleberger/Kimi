import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export function useProfile() {
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const syncAttempted = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      setProfile(null);
      setLoading(false);
      syncAttempted.current = false;
      return;
    }

    async function fetchProfile() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', clerkUser!.id)
        .single();

      if (data) {
        setProfile(data as UserProfile);
        setLoading(false);
        return;
      }

      // User doesn't exist in Supabase yet — trigger sync
      if (!syncAttempted.current) {
        syncAttempted.current = true;
        try {
          const displayName =
            clerkUser!.username ||
            clerkUser!.primaryEmailAddress?.emailAddress?.split('@')[0] ||
            'Player';

          const resp = await fetch('/api/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: displayName }),
          });

          if (resp.ok) {
            // Re-fetch after sync
            const { data: synced } = await supabase
              .from('users')
              .select('*')
              .eq('id', clerkUser!.id)
              .single();
            setProfile(synced as UserProfile | null);
          }
        } catch (err) {
          console.error('Failed to sync user:', err);
        }
      }
      setLoading(false);
    }

    fetchProfile();
  }, [clerkUser, isLoaded]);

  const refreshBalance = useCallback(async () => {
    if (!clerkUser) return;
    const { data } = await supabase
      .from('users')
      .select('balance, wins, losses, current_streak, total_wagered, total_won')
      .eq('id', clerkUser.id)
      .single();
    if (data) setProfile((prev) => (prev ? { ...prev, ...data } : null));
  }, [clerkUser]);

  return {
    user: profile,
    loading,
    refreshBalance,
    clerkUser,
    isSignedIn: !!clerkUser,
  };
}
