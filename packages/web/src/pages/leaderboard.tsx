import React from 'react';
import { useLeaderboard } from '@/hooks/useMatches';
import { Trophy, Flame, Snowflake, Users } from 'lucide-react';

export default function LeaderboardPage() {
  const { leaderboard, loading } = useLeaderboard();

  const sorted = [...leaderboard].sort((a, b) => b.balance - a.balance);
  const podiumOrder = sorted.length >= 3 ? [sorted[1], sorted[0], sorted[2]] : sorted;

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
          {podiumOrder.length >= 3 && (
            <div className="lb-podium">
              {podiumOrder.map((u) => (
                <div className="lb-podium-item" key={u.id}>
                  <div className="lb-podium-avatar">{u.avatar_emoji}</div>
                  <div className="lb-podium-name">{u.username}</div>
                  <div
                    className="lb-podium-profit"
                    style={{
                      color: u.profit >= 0 ? 'var(--accent-green)' : 'var(--accent)',
                    }}
                  >
                    {u.profit >= 0 ? '+' : ''}
                    {u.profit.toLocaleString()} K
                  </div>
                  <div className="lb-podium-rank">
                    #{sorted.indexOf(u) + 1}
                  </div>
                  <div className="lb-bar" />
                </div>
              ))}
            </div>
          )}

          <div className="lb-table">
            <div className="lb-row lb-row-head">
              <div>#</div>
              <div>Player</div>
              <div>Record</div>
              <div>Profit</div>
              <div className="lb-streak">Streak</div>
              <div className="lb-balance" style={{ textAlign: 'right' }}>
                Balance
              </div>
            </div>
            {sorted.map((u, i) => (
              <div className="lb-row" key={u.id}>
                <div className="lb-rank">{i + 1}</div>
                <div className="lb-user">
                  <span className="lb-user-avatar">{u.avatar_emoji}</span>
                  <span className="lb-user-name">{u.username}</span>
                </div>
                <div className="lb-record">
                  {u.wins}W - {u.losses}L
                </div>
                <div
                  className={
                    u.profit >= 0 ? 'lb-profit-positive' : 'lb-profit-negative'
                  }
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {u.profit >= 0 ? '+' : ''}
                  {u.profit.toLocaleString()}
                </div>
                <div
                  className={`lb-streak ${
                    u.current_streak > 0 ? 'positive' : 'negative'
                  }`}
                >
                  {u.current_streak > 0
                    ? <><Flame size={12} style={{ display: 'inline' }} /> {u.current_streak}W</>
                    : u.current_streak < 0
                    ? <><Snowflake size={12} style={{ display: 'inline' }} /> {Math.abs(u.current_streak)}L</>
                    : '—'}
                </div>
                <div className="lb-balance">{u.balance.toLocaleString()} K</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
