import React from 'react';
import { useLeaderboard } from '@/hooks/useMatches';
import { Trophy, Flame, Snowflake, Users, User } from 'lucide-react';
import { CoinIcon } from '@/components/Nav';

function MedalIcon({ place }: { place: number }) {
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: '#f5c542', text: '#080a0f' },
    2: { bg: '#b0b4cc', text: '#080a0f' },
    3: { bg: '#cd7f32', text: '#080a0f' },
  };
  const c = colors[place] || { bg: '#6b7094', text: '#fff' };
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={c.bg} />
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fill={c.text} fontFamily="'Manrope',sans-serif" fontWeight="800" fontSize="12">
        {place}
      </text>
    </svg>
  );
}

export default function LeaderboardPage() {
  const { leaderboard, loading } = useLeaderboard();

  const sorted = [...leaderboard].sort((a, b) => b.balance - a.balance);
  const podium = sorted.length >= 3
    ? [
        { user: sorted[1], place: 2, label: '2nd' },
        { user: sorted[0], place: 1, label: '1st' },
        { user: sorted[2], place: 3, label: '3rd' },
      ]
    : null;

  const medalColors: Record<number, string> = {
    1: '#f5c542',
    2: '#b0b4cc',
    3: '#cd7f32',
  };

  return (
    <div className="lb-container anim-in">
      <div className="hero-banner" style={{ marginBottom: 24 }}>
        <div className="hero-badge">
          <div className="pulse" /> Season 1
        </div>
        <div className="hero-title" style={{ fontSize: 28 }}>
          <Trophy size={22} style={{ marginRight: 8 }} /> K-Coin Leaderboard
        </div>
        <div className="hero-sub">
          See who&apos;s on top among your crew. Bragging rights are everything.
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading...
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Users size={36} style={{ marginBottom: 12, color: 'var(--text-muted)' }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No players yet</div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
            Sign up and place your first entry to appear on the leaderboard.
          </div>
        </div>
      ) : (
        <>
          {/* Podium */}
          {podium && (
            <div className="lb-podium">
              {podium.map((p) => (
                <div
                  className={`lb-podium-card ${p.place === 1 ? 'first' : p.place === 2 ? 'second' : 'third'}`}
                  key={p.user.id}
                >
                  <MedalIcon place={p.place} />
                  <div className="lb-podium-rank">#{p.place}</div>
                  <div className="lb-podium-name">{p.user.username}</div>
                  <div
                    className="lb-podium-profit"
                    style={{
                      color: p.user.profit >= 0 ? 'var(--accent)' : 'var(--red)',
                    }}
                  >
                    {p.user.profit >= 0 ? '+' : ''}
                    {p.user.profit.toLocaleString()}
                  </div>
                  <div className="lb-podium-balance" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CoinIcon size={12} /> {p.user.balance.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="lb-table">
            <div className="lb-row lb-header">
              <div className="lb-col lb-col-rank">#</div>
              <div className="lb-col lb-col-player">Player</div>
              <div className="lb-col lb-col-record">Record</div>
              <div className="lb-col lb-col-profit">Profit</div>
              <div className="lb-col lb-col-streak">Streak</div>
              <div className="lb-col lb-col-balance">Balance</div>
            </div>
            {sorted.map((u, i) => (
              <div className="lb-row" key={u.id}>
                <div className="lb-col lb-col-rank">
                  {i < 3 ? (
                    <MedalIcon place={i + 1} />
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="lb-col lb-col-player">
                  <span className="lb-user-avatar"><User size={14} /></span>
                  <span className="lb-user-name">{u.username}</span>
                </div>
                <div className="lb-col lb-col-record">
                  {u.wins}W - {u.losses}L
                </div>
                <div
                  className={`lb-col lb-col-profit ${u.profit >= 0 ? 'positive' : 'negative'}`}
                >
                  {u.profit >= 0 ? '+' : ''}
                  {u.profit.toLocaleString()}
                </div>
                <div className="lb-col lb-col-streak">
                  {u.current_streak > 0 ? (
                    <span className="lb-streak-badge hot">
                      <Flame size={12} /> {u.current_streak}W
                    </span>
                  ) : u.current_streak < 0 ? (
                    <span className="lb-streak-badge cold">
                      <Snowflake size={12} /> {Math.abs(u.current_streak)}L
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
                <div className="lb-col lb-col-balance" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <CoinIcon size={13} /> {u.balance.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
