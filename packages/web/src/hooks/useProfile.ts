import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export function useProfile() {
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', clerkUser!.id)
        .single();
      setProfile(data as UserProfile | null);
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
