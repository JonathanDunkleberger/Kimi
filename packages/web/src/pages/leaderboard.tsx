import React from 'react';
import { useLeaderboard } from '@/hooks/useMatches';
import { Trophy, Flame, Snowflake } from 'lucide-react';

export default function LeaderboardPage() {
  const { leaderboard, loading } = useLeaderboard();

  // Fallback data for when DB is empty
  const data =
    leaderboard.length > 0
      ? leaderboard
      : [
          { id: '1', username: 'xVaLkYrIe', avatar_emoji: 'VK', balance: 28450, wins: 47, losses: 18, current_streak: 5, profit: 18450, win_rate: 72.3, total_wagered: 0, total_won: 0 },
          { id: '2', username: 'DunkMaster_J', avatar_emoji: 'DJ', balance: 22100, wins: 39, losses: 22, current_streak: 3, profit: 12100, win_rate: 63.9, total_wagered: 0, total_won: 0 },
          { id: '3', username: 'phantomAce', avatar_emoji: 'PA', balance: 18300, wins: 35, losses: 26, current_streak: -2, profit: 8300, win_rate: 57.4, total_wagered: 0, total_won: 0 },
          { id: '4', username: 'valorViper99', avatar_emoji: 'VV', balance: 15800, wins: 31, losses: 28, current_streak: 1, profit: 5800, win_rate: 52.5, total_wagered: 0, total_won: 0 },
          { id: '5', username: 'cyph3r_main', avatar_emoji: 'CM', balance: 12200, wins: 28, losses: 31, current_streak: -4, profit: 2200, win_rate: 47.5, total_wagered: 0, total_won: 0 },
          { id: '6', username: 'jettSetGo', avatar_emoji: 'JS', balance: 9400, wins: 24, losses: 33, current_streak: -1, profit: -600, win_rate: 42.1, total_wagered: 0, total_won: 0 },
          { id: '7', username: 'sageHealer', avatar_emoji: 'SH', balance: 7100, wins: 20, losses: 37, current_streak: -6, profit: -2900, win_rate: 35.1, total_wagered: 0, total_won: 0 },
          { id: '8', username: 'bottom_frag_andy', avatar_emoji: 'BF', balance: 3200, wins: 14, losses: 42, current_streak: -8, profit: -6800, win_rate: 25.0, total_wagered: 0, total_won: 0 },
        ];

  const sorted = [...data].sort((a, b) => b.balance - a.balance);
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
                    : <><Snowflake size={12} style={{ display: 'inline' }} /> {Math.abs(u.current_streak)}L</>}
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
