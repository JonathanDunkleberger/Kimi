import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useMyEntries } from '@/hooks/useMatches';
import { User, Lock, Clock, CheckCircle2, XCircle, TrendingUp, TrendingDown, Flame, ArrowUp, ArrowDown, Wallet } from 'lucide-react';
import { CoinIcon } from '@/components/Nav';
import Link from 'next/link';
import dayjs from 'dayjs';

export default function Profile() {
  const { user } = useProfile();
  const { entries, loading } = useMyEntries(user?.id);

  if (!user) {
    return (
      <div className="entries-empty anim-in">
        <div style={{ marginBottom: 12 }}><Lock size={36} /></div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Sign in to view your profile</div>
        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
          Your stats and recent entries will appear here.
        </div>
      </div>
    );
  }

  const winRate = (user.wins + user.losses) > 0
    ? Math.round((user.wins / (user.wins + user.losses)) * 100)
    : 0;
  const profit = (user.balance ?? 10000) - 10000;

  return (
    <div className="anim-in">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <User size={24} />
        </div>
        <div>
          <h2 className="profile-name">{user.username}</h2>
          <div className="profile-balance">
            <CoinIcon size={16} />
            <span>{(user.balance ?? 0).toLocaleString()}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 2 }}>K-Coins</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="profile-stats">
        <div className="profile-stat-card">
          <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
          <div className="profile-stat-value" style={{ color: 'var(--accent)' }}>{user.wins ?? 0}</div>
          <div className="profile-stat-label">Wins</div>
        </div>
        <div className="profile-stat-card">
          <TrendingDown size={18} style={{ color: 'var(--red)' }} />
          <div className="profile-stat-value" style={{ color: 'var(--red)' }}>{user.losses ?? 0}</div>
          <div className="profile-stat-label">Losses</div>
        </div>
        <div className="profile-stat-card">
          <Flame size={18} style={{ color: 'var(--gold)' }} />
          <div className="profile-stat-value" style={{ color: 'var(--gold)' }}>{user.current_streak ?? 0}</div>
          <div className="profile-stat-label">Streak</div>
        </div>
        <div className="profile-stat-card">
          <Wallet size={18} style={{ color: profit >= 0 ? 'var(--accent)' : 'var(--red)' }} />
          <div className="profile-stat-value" style={{ color: profit >= 0 ? 'var(--accent)' : 'var(--red)' }}>
            {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
          </div>
          <div className="profile-stat-label">Profit</div>
        </div>
      </div>

      {/* Win Rate Bar */}
      <div className="profile-winrate-card">
        <div className="profile-winrate-header">
          <span>Win Rate</span>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{winRate}%</span>
        </div>
        <div className="profile-winrate-bar">
          <div
            className="profile-winrate-fill"
            style={{ width: `${winRate}%` }}
          />
        </div>
        <div className="profile-winrate-detail">
          <span>{user.wins}W – {user.losses}L</span>
          <span>Wagered: {(user.total_wagered ?? 0).toLocaleString()} K</span>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="profile-section-title">
        <span>Recent Entries</span>
        {entries.length > 0 && (
          <Link href="/entries" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            View All →
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Loading entries...
        </div>
      ) : entries.length === 0 ? (
        <div className="entries-empty" style={{ padding: '40px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No entries yet</div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
            Head to the Board and build your first lineup!
          </div>
        </div>
      ) : (
        <div className="entries-list">
          {entries.slice(0, 5).map((e) => (
            <div className="entry-card" key={e.id}>
              <div className="entry-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`entry-status ${e.status.toUpperCase()}`}>
                    {e.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                    {dayjs(e.created_at).format('MMM D, HH:mm')}
                  </span>
                </div>
                <div className="entry-amounts">
                  <div>
                    <div className="label">Wager</div>
                    <div className="value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CoinIcon size={13} /> {e.wager.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>→</div>
                  <div>
                    <div className="label">Payout</div>
                    <div className="value" style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CoinIcon size={13} /> {e.potential_payout.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 700, alignSelf: 'flex-end' }}>
                    {e.multiplier}x
                  </div>
                </div>
              </div>
              <div className="entry-legs">
                {e.entry_legs?.map((leg) => {
                  const playerName = (leg.prop_line?.player as any)?.ign || (leg.prop_line?.player as any)?.name || 'Player';
                  const propTypeName = (leg.prop_line?.prop_type as any)?.name || 'Total Kills';
                  return (
                    <div className="entry-leg" key={leg.id}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="entry-leg-player">{playerName}</div>
                        <div className="entry-leg-detail">{propTypeName} — {leg.prop_line?.line_value}</div>
                      </div>
                      <span className={`entry-leg-pick ${leg.pick}`}>
                        {leg.pick === 'over' ? <><ArrowUp size={10} strokeWidth={3} /> OVR</> : <><ArrowDown size={10} strokeWidth={3} /> UND</>}
                      </span>
                      <span className="entry-leg-result">
                        {leg.result === 'won' ? <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} /> :
                         leg.result === 'lost' ? <XCircle size={16} style={{ color: 'var(--red)' }} /> :
                         <Clock size={14} style={{ color: 'var(--text-muted)' }} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
