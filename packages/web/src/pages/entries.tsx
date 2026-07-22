import React from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { useAuth } from "@/lib/authClient";
import { useEntries } from "@/lib/api";
import { formatCredits } from "@/lib/multipliers";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

export default function EntriesPage() {
  const { isSignedIn, getToken } = useAuth();
  const [token, setToken] = React.useState<string | undefined>();
  const [tab, setTab] = React.useState<"OPEN" | "PAST">("OPEN");

  React.useEffect(() => {
    if (isSignedIn) getToken().then((t) => setToken(t || undefined));
    else setToken(undefined);
  }, [isSignedIn, getToken]);

  const { entries, isLoading, refresh } = useEntries(token);

  const open = entries.filter((e) => e.isWin === null || e.isWin === undefined);
  const past = entries.filter((e) => e.isWin !== null && e.isWin !== undefined);
  const list = tab === "OPEN" ? open : past;

  const pnl = past.reduce((acc, e) => {
    if (e.isWin) return acc + (e.payout - e.wager);
    return acc - e.wager;
  }, 0);

  const TabBtn = ({ id, label }: { id: "OPEN" | "PAST"; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`h-8 rounded-full px-4 text-[11px] font-bold uppercase tracking-wide transition-colors ${
        tab === id
          ? "bg-foreground text-background"
          : "bg-[var(--card)] text-[var(--text-muted)] hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-fade space-y-3">
      <div className="flex items-center gap-1.5">
        <h1 className="mr-2 font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
          Lineups
        </h1>
        <TabBtn id="OPEN" label={`Open (${open.length})`} />
        <TabBtn id="PAST" label={`Past (${past.length})`} />
        <button
          type="button"
          onClick={() => refresh()}
          className="ml-auto text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)] hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      {tab === "PAST" && past.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Total P/L
          </span>
          <span
            className={`num font-black ${
              pnl >= 0 ? "text-[var(--win)]" : "text-[var(--less)]"
            }`}
          >
            {pnl >= 0 ? "+" : ""}
            {formatCredits(pnl)}
          </span>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-[var(--text-muted)]">Loading lineups…</p>
      )}

      <div className="space-y-2.5">
        {list.map((e) => (
          <article
            key={e.id}
            className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                  {dayjs(e.createdAt).format("MMM D · h:mm A")} ·{" "}
                  {e.picks.length} picks
                </p>
                <p className="num text-[15px] font-black text-foreground">
                  {formatCredits(e.wager)}{" "}
                  <span className="text-[var(--text-faint)]">→</span>{" "}
                  <span
                    className={
                      e.isWin === false
                        ? "text-[var(--text-faint)] line-through"
                        : "text-[var(--accent)]"
                    }
                  >
                    {formatCredits(e.payout)}
                  </span>
                </p>
              </div>
              <span
                className={`rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                  e.isWin === true
                    ? "bg-[var(--win)]/15 text-[var(--win)]"
                    : e.isWin === false
                    ? "bg-[var(--less)]/15 text-[var(--less)]"
                    : "bg-[var(--accent)]/15 text-[var(--accent)]"
                }`}
              >
                {e.isWin === true ? "Won" : e.isWin === false ? "Lost" : "Open"}
              </span>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {e.picks.map((pk) => (
                <div key={pk.id} className="flex items-center gap-2.5 px-3 py-2">
                  <PlayerAvatar
                    name={pk.playerProjection.player.name}
                    team={pk.playerProjection.player.team}
                    imageUrl={pk.playerProjection.player.imageUrl}
                    size={32}
                  />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                    {pk.playerProjection.player.name}{" "}
                    <span
                      className={`text-[11px] font-extrabold uppercase ${
                        pk.pickType === "MORE"
                          ? "text-[var(--accent)]"
                          : "text-[var(--less)]"
                      }`}
                    >
                      {pk.pickType}
                    </span>{" "}
                    <span className="num text-[var(--text-muted)]">
                      {pk.lineAtLock ?? pk.playerProjection.value}
                    </span>{" "}
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {pk.playerProjection.statType}
                    </span>
                  </p>
                  {pk.isWin != null && (
                    <span
                      className={`text-sm font-black ${
                        pk.isWin ? "text-[var(--win)]" : "text-[var(--less)]"
                      }`}
                    >
                      {pk.isWin ? "✓" : "✗"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {!isLoading && list.length === 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] py-14 text-center">
          <p className="font-display text-sm font-bold text-foreground">
            {tab === "OPEN" ? "No open lineups" : "No settled lineups yet"}
          </p>
          {tab === "OPEN" && (
            <Link
              href="/"
              className="mt-1 inline-block text-xs font-bold text-[var(--accent)] no-underline"
            >
              Go to the Board →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
