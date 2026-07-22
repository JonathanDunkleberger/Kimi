import { useLeaderboard } from "@/lib/api";
import { formatCredits } from "@/lib/multipliers";

export default function LeaderboardPage() {
  const { rows, period, isLoading } = useLeaderboard();

  return (
    <div className="animate-fade space-y-3">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
          Leaderboard
        </h1>
        <span className="text-[11px] font-semibold text-[var(--text-faint)]">
          Last {period || "7d"} · Credits won
        </span>
      </div>

      {isLoading && (
        <p className="text-sm text-[var(--text-muted)]">Loading ranks…</p>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]">
        {rows.map((r) => (
          <div
            key={r.userId}
            className="flex items-center gap-3 border-b border-[var(--line)]/50 px-3 py-2.5 last:border-0"
          >
            <div
              className={`num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                r.rank === 1
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : r.rank <= 3
                  ? "bg-[var(--card-2)] text-foreground"
                  : "bg-transparent text-[var(--text-faint)]"
              }`}
            >
              {r.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-foreground">
                {r.username}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {r.entries} entries · {(r.winRate * 100).toFixed(0)}% hit rate
              </p>
            </div>
            <p className="num text-[15px] font-black text-[var(--win)]">
              +{formatCredits(r.profit)}
            </p>
          </div>
        ))}
      </div>

      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] py-14 text-center">
          <p className="font-display text-sm font-bold text-foreground">
            No ranks yet
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Submit a lineup to climb.
          </p>
        </div>
      )}
    </div>
  );
}
