import { useLeaderboard } from "@/lib/api";
import { formatCrowns } from "@/lib/multipliers";

export default function LeaderboardPage() {
  const { rows, period, isLoading } = useLeaderboard();

  return (
    <div className="animate-fade-rise space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Last {period || "7d"} · Credits won
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Leaderboard
        </h1>
      </section>

      {isLoading && <p className="text-sm text-muted-foreground">Loading ranks…</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.userId}
            className={`flex items-center gap-4 rounded-2xl border border-border bg-[var(--panel)] px-4 py-4 ${
              r.rank <= 3 ? "glow-gold" : ""
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-extrabold ${
                r.rank === 1
                  ? "bg-[var(--lime)] text-primary-foreground"
                  : r.rank === 2
                  ? "bg-white/80 text-[#10141c]"
                  : r.rank === 3
                  ? "bg-[var(--coral)]/80 text-white"
                  : "bg-[var(--panel-2)] text-muted-foreground"
              }`}
            >
              {r.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold text-foreground">
                {r.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.entries} entries · {(r.winRate * 100).toFixed(0)}% hit rate
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Profit
              </p>
              <p className="font-display text-xl font-extrabold text-[var(--win)]">
                +{formatCrowns(r.profit)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && rows.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          No ranks yet — submit a lineup to climb.
        </p>
      )}
    </div>
  );
}
