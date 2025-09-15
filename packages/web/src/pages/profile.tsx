import React from 'react';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : (null as any);

export default function Profile() {
  const [entries, setEntries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      if (!supabase) return;
      setLoading(true);
      // TODO: Replace with session-based filter; currently grabs first user only for demo
      const { data: user } = await supabase.from('users').select('id').limit(1).single();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setEntries(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Your Bets</h1>
      {loading && <div>Loading...</div>}
      {!loading && entries.length === 0 && <div className="text-sm text-muted-foreground">No bets yet.</div>}
      <ul className="space-y-3">
        {entries.map(e => (
          <li key={e.id} className="border rounded p-3 bg-card">
            <div className="flex justify-between text-sm mb-1">
              <span>{e.payout_rule}</span>
              <span className="text-muted-foreground">{dayjs(e.created_at).format('MMM D, HH:mm')}</span>
            </div>
            <div className="text-sm">Stake: {e.stake} • Status: {e.status}</div>
            <div className="mt-2 text-xs space-y-1">
              {(e.legs_json || []).map((l: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>{l.line_id} {l.side}</span>
                  <span>{l.status || 'PENDING'}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
