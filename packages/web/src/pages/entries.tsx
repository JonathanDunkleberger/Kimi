import React from "react";
import dayjs from "dayjs";
import { useAuth } from "@/lib/authClient";
import { useEntries } from "@/lib/api";
import { formatCrowns } from "@/lib/multipliers";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

export default function EntriesPage() {
  const { isSignedIn, getToken } = useAuth();
  const [token, setToken] = React.useState<string | undefined>();
  const [tab, setTab] = React.useState<"LIVE" | "PAST">("LIVE");

  React.useEffect(() => {
    if (isSignedIn) getToken().then((t) => setToken(t || undefined));
    else setToken(undefined);
  }, [isSignedIn, getToken]);

  const { entries, isLoading, refresh } = useEntries(token);

  const live = entries.filter((e) => e.isWin === null || e.isWin === undefined);
  const past = entries.filter((e) => e.isWin !== null && e.isWin !== undefined);
  const list = tab === "LIVE" ? live : past;

  const pnl = past.reduce((acc, e) => {
    if (e.isWin) return acc + (e.payout - e.wager);
    return acc - e.wager;
  }, 0);

  return (
    <div className="animate-fade-rise space-y-6">
      <section className="rounded-2xl border border-filigree bg-hearth px-5 py-6 md:px-7">
        <p className="font-serif text-sm italic text-muted-foreground">
          Open quests and settled fortunes — Crowns only, friends only
        </p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-[0.08em] text-gold-bright md:text-4xl">
          Your Quests
        </h1>
        <div className="rune-rule mt-4" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setTab("LIVE")}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
            tab === "LIVE"
              ? "border-gold/50 bg-gold/15 text-gold-bright"
              : "border-border text-muted-foreground"
          }`}
        >
          Live ({live.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("PAST")}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
            tab === "PAST"
              ? "border-gold/50 bg-gold/15 text-gold-bright"
              : "border-border text-muted-foreground"
          }`}
        >
          Past ({past.length})
        </button>
        <button
          type="button"
          onClick={() => refresh()}
          className="ml-auto text-xs font-semibold text-muted-foreground hover:text-gold"
        >
          Refresh
        </button>
        {tab === "PAST" && (
          <div className="rounded-lg border border-border bg-moss/40 px-3 py-1.5 text-sm">
            P/L{" "}
            <span className={pnl >= 0 ? "text-leaf-bright" : "text-destructive"}>
              {pnl >= 0 ? "+" : ""}
              {formatCrowns(pnl)}
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="font-serif italic text-muted-foreground">Consulting the ledger…</p>
      )}

      <div className="space-y-4">
        {list.map((e) => (
          <article
            key={e.id}
            className="rounded-2xl border border-filigree bg-hearth p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {dayjs(e.createdAt).format("MMM D · h:mm A")}
                </p>
                <p className="font-display text-lg text-parchment">
                  {formatCrowns(e.wager)} → {formatCrowns(e.payout)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  e.isWin === true
                    ? "bg-leaf/20 text-leaf-bright"
                    : e.isWin === false
                    ? "bg-destructive/20 text-destructive"
                    : "bg-gold/15 text-gold-bright"
                }`}
              >
                {e.isWin === true ? "Won" : e.isWin === false ? "Lost" : e.status || "Locked"}
              </span>
            </div>
            <div className="space-y-2">
              {e.picks.map((pk) => (
                <div
                  key={pk.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-ink/40 px-3 py-2"
                >
                  <PlayerAvatar
                    name={pk.playerProjection.player.name}
                    team={pk.playerProjection.player.team}
                    imageUrl={pk.playerProjection.player.imageUrl}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {pk.playerProjection.player.name}{" "}
                      <span
                        className={
                          pk.pickType === "MORE" ? "text-ember" : "text-frost"
                        }
                      >
                        {pk.pickType}
                      </span>{" "}
                      {pk.lineAtLock ?? pk.playerProjection.value}{" "}
                      {pk.playerProjection.statType}
                    </p>
                  </div>
                  {pk.isWin != null && (
                    <span className={pk.isWin ? "text-leaf-bright" : "text-destructive"}>
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
        <p className="py-16 text-center font-serif text-lg italic text-muted-foreground">
          {tab === "LIVE"
            ? "No open quests. Return to The Lists and seal a slip."
            : "No settled entries yet — the Hall waits."}
        </p>
      )}
    </div>
  );
}
