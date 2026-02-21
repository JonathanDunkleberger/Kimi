import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface AuthStore {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await get().fetchProfile();
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    if (data.user) {
      // The DB trigger auto-creates a users row, but set the username
      await supabase
        .from('users')
        .upsert({ id: data.user.id, username, balance: 10000 });
      await get().fetchProfile();
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  fetchProfile: async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      set({ user: null, loading: false });
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    set({ user: data as UserProfile | null, loading: false });
  },

  refreshBalance: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('balance, wins, losses, current_streak, total_wagered, total_won')
      .eq('id', user.id)
      .single();
    if (data) set({ user: { ...user, ...data } });
  },
}));

// Listen for auth state changes (login/logout/token refresh)
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      useAuthStore.getState().fetchProfile();
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.setState({ user: null, loading: false });
    }
  });
}
