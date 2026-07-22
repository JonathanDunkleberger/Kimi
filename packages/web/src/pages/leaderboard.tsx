import { useLeaderboard } from "@/lib/api";
import { formatCrowns } from "@/lib/multipliers";

export default function LeaderboardPage() {
  const { rows, period, isLoading } = useLeaderboard();

  return (
    <div className="animate-fade-rise space-y-6">
      <section className="rounded-2xl border border-filigree bg-hearth px-5 py-6 md:px-7">
        <p className="font-serif text-sm italic text-muted-foreground">
          Where wanderers are weighed · last {period || "7d"} · Crowns won, not dollars
        </p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-[0.08em] text-gold-bright md:text-4xl">
          Hall of Fame
        </h1>
        <div className="rune-rule mt-4" />
      </section>

      {isLoading && (
        <p className="font-serif italic text-muted-foreground">Calling the names…</p>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.userId}
            className={`flex items-center gap-4 rounded-2xl border border-filigree bg-hearth px-4 py-4 ${
              r.rank <= 3 ? "glow-gold" : ""
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-lg ${
                r.rank === 1
                  ? "bg-gold text-primary-foreground"
                  : r.rank === 2
                  ? "bg-parchment/80 text-ink"
                  : r.rank === 3
                  ? "bg-ember/80 text-white"
                  : "bg-moss text-muted-foreground"
              }`}
            >
              {r.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg text-parchment">{r.username}</p>
              <p className="text-xs text-muted-foreground">
                {r.entries} entries · {(r.winRate * 100).toFixed(0)}% hit rate
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Profit
              </p>
              <p className="font-display text-xl text-leaf-bright">
                +{formatCrowns(r.profit)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && rows.length === 0 && (
        <p className="py-16 text-center font-serif text-lg italic text-muted-foreground">
          The Hall is empty. Seal a slip and carve your name.
        </p>
      )}
    </div>
  );
}
