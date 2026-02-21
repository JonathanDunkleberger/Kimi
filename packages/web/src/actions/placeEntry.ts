import { supabase } from '@/lib/supabase';
import { useSlipStore } from '@/stores/slipStore';

export async function placeEntry(userId: string, refreshBalance: () => Promise<void>) {
  const { picks, wager, getMultiplier, getPotentialPayout, clearSlip } =
    useSlipStore.getState();

  if (!userId) throw new Error('Not logged in');
  if (picks.length < 2) throw new Error('Need at least 2 picks');
  if (picks.length > 6) throw new Error('Maximum 6 picks allowed');
  if (wager < 50) throw new Error('Minimum wager is 50 K-Coins');
  if (wager > 2000) throw new Error('Maximum wager is 2,000 K-Coins');

  const legs = picks.map((p) => ({
    prop_line_id: p.propLine.id,
    pick: p.direction,
  }));

  const { data, error } = await supabase.rpc('place_entry', {
    p_user_id: userId,
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
