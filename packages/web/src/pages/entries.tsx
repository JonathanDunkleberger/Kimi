import React from 'react';
import { useEntries } from '../lib/api';
import { useAuth } from '@clerk/nextjs';

function statusStyle(e: { isWin?: boolean | null }) {
  if (e.isWin === true) return { background: 'rgba(47,210,143,0.20)' };
  if (e.isWin === false) return { background: 'rgba(255,107,107,0.20)' };
  return { background: 'rgba(255,255,255,0.12)' };
}

export default function EntriesPage() {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = React.useState<string | undefined>();
  React.useEffect(() => { (async () => { if (isSignedIn) { try { const t = await getToken({ template: 'default' }); setToken(t || undefined); } catch {} } else { setToken(undefined); } })(); }, [isSignedIn, getToken]);
  const { entries, error, isLoading, refresh } = useEntries(token);

  return (
    <div className="container">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 style={{margin:'8px 0'}}>Your Entries</h2>
        <button className="btn" onClick={()=>refresh()}>Refresh</button>
      </div>
      {isLoading && <div className='card' style={{padding:16}}>Loading…</div>}
      {error && <div className='card' style={{padding:16, color:'var(--danger)'}}>Error loading entries.</div>}
      {entries.length === 0 && !isLoading && <div className='card' style={{padding:16}}>No entries yet.</div>}
      <div style={{display:'grid', gap:12}}>
        {entries.map(e => (
          <div key={e.id} className='card' style={{padding:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <div>
                <div style={{fontWeight:600}}>Entry • {new Date(e.createdAt).toLocaleString()}</div>
                <div className='small'>Wager: {e.wager} • Potential Payout: {e.payout}</div>
              </div>
              <span className='badge' style={statusStyle(e)}>{e.isWin === null || e.isWin === undefined ? 'OPEN' : e.isWin ? 'WON' : 'LOST'}</span>
            </div>
            <div style={{display:'grid', gap:8}}>
              {e.picks.map(p => (
                <div key={p.id} className='card' style={{padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600}}>{p.playerProjection.player.name}</div>
                    <div className='small'>{p.playerProjection.player.team} • {p.playerProjection.statType} {p.pickType} {p.playerProjection.value}</div>
                  </div>
                  <span className='badge'>{p.isWin === null || p.isWin === undefined ? 'Pending' : p.isWin ? 'Hit' : 'Miss'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}