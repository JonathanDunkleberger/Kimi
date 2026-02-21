import { supabase } from '@/lib/supabase';
import { useSlipStore } from '@/stores/slipStore';
import { useAuthStore } from '@/stores/authStore';

export async function placeEntry() {
  const { picks, wager, getMultiplier, getPotentialPayout, clearSlip } =
    useSlipStore.getState();
  const { user, refreshBalance } = useAuthStore.getState();

  if (!user) throw new Error('Not logged in');
  if (picks.length < 2) throw new Error('Need at least 2 picks');
  if (wager < 10) throw new Error('Minimum wager is 10 K-Coins');
  if (wager > user.balance) throw new Error('Insufficient balance');

  const legs = picks.map((p) => ({
    prop_line_id: p.propLine.id,
    pick: p.direction,
  }));

  const { data, error } = await supabase.rpc('place_entry', {
    p_user_id: user.id,
    p_legs: legs,
    p_wager: wager,
    p_multiplier: getMultiplier(),
    p_potential_payout: getPotentialPayout(),
  });

  if (error) throw error;

  clearSlip();
  await refreshBalance();

  return data; // entry_id
}
