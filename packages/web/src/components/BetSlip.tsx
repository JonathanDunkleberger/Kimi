import React from "react";
import { useBetSlip, type Selection } from "@/store/betSlipStore";
import { useAuth } from "@/lib/authClient";
import { createEntry } from "@/lib/api";
import {
  getMultiplier,
  MIN_PICKS,
  MAX_PICKS,
  MULTIPLIERS,
  formatCredits,
} from "@/lib/multipliers";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { X } from "lucide-react";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

function Leg({
  s,
  onToggle,
  onRemove,
}: {
  s: Selection;
  onToggle: (pickType: "MORE" | "LESS") => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-[var(--card-2)] p-2 pr-1.5">
      <PlayerAvatar name={s.player} team={s.team} imageUrl={s.imageUrl} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold leading-tight text-foreground">
          {s.player}
        </p>
        <p className="truncate text-[11px] text-[var(--text-muted)]">
          <span className="num font-bold text-foreground">{s.value}</span>{" "}
          {s.statType}
          {s.scope === "MAP" ? ` · Map ${s.mapNumber}` : ""}
        </p>
      </div>
      <div className="flex overflow-hidden rounded-md border border-[var(--line-strong)]">
        <button
          type="button"
          onClick={() => onToggle("LESS")}
          className={`h-7 w-11 text-[10px] font-extrabold uppercase transition-colors ${
            s.pickType === "LESS"
              ? "bg-[var(--less)] text-white"
              : "bg-transparent text-[var(--text-muted)] hover:text-foreground"
          }`}
        >
          Less
        </button>
        <button
          type="button"
          onClick={() => onToggle("MORE")}
          className={`h-7 w-11 border-l border-[var(--line-strong)] text-[10px] font-extrabold uppercase transition-colors ${
            s.pickType === "MORE"
              ? "bg-[var(--accent)] text-[var(--accent-ink)]"
              : "bg-transparent text-[var(--text-muted)] hover:text-foreground"
          }`}
        >
          More
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${s.player}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-faint)] transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function BetSlip({ embedded = false }: { embedded?: boolean }) {
  const { selections, remove, clear, toggle, setSlipOpen } = useBetSlip();
  const { getToken, isSignedIn } = useAuth();
  const [wager, setWager] = React.useState("1000");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const count = selections.length;
  const multiplier = getMultiplier(count);
  const stake = Number(wager) || 0;
  const toWin = stake * multiplier;
  const canSubmit = count >= MIN_PICKS && stake > 0 && !submitting;

  const place = async () => {
    setError(null);
    setSuccess(false);
    if (!canSubmit) {
      setError(`Pick at least ${MIN_PICKS} projections`);
      return;
    }
    setSubmitting(true);
    try {
      const token = isSignedIn ? (await getToken()) || undefined : undefined;
      await createEntry(
        {
          wager: stake,
          picks: selections.map((s) => ({
            playerProjectionId: s.projectionId,
            pickType: s.pickType,
          })),
        },
        token
      );
      clear();
      setSuccess(true);
      window.dispatchEvent(new Event("entry-placed"));
      setTimeout(() => {
        setSuccess(false);
        setSlipOpen(false);
      }, 1800);
    } catch (e: any) {
      setError(e?.message || "Failed to submit lineup");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`flex flex-col overflow-hidden bg-[var(--bg-elev)] ${
        embedded ? "" : "rounded-xl border border-[var(--line)]"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 pb-2 pt-3.5 ${
          embedded ? "pr-12" : ""
        }`}
      >
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
          Current Lineup
          <span className="ml-2 rounded bg-[var(--card-2)] px-1.5 py-0.5 num text-xs font-bold text-[var(--text-muted)]">
            {count}/{MAX_PICKS}
          </span>
        </h2>
        {count > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)] transition-colors hover:text-[var(--less)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Multiplier ladder — always visible */}
      <div className="grid grid-cols-5 gap-1 px-3 pb-3">
        {[2, 3, 4, 5, 6].map((n) => {
          const active = count === n;
          return (
            <div
              key={n}
              className={`rounded-md border py-1.5 text-center transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--line)] bg-transparent"
              }`}
            >
              <div
                className={`num text-sm font-black leading-none ${
                  active ? "text-[var(--accent)]" : "text-foreground/70"
                }`}
              >
                {MULTIPLIERS[n]}x
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                {n} picks
              </div>
            </div>
          );
        })}
      </div>

      {/* Legs */}
      {count === 0 ? (
        <div className="border-t border-[var(--line)] px-6 py-10 text-center">
          <p className="font-display text-sm font-bold text-foreground">
            No picks yet
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Tap <span className="font-bold text-foreground">More</span> or{" "}
            <span className="font-bold text-foreground">Less</span> on{" "}
            {MIN_PICKS}–{MAX_PICKS} projections to build a lineup.
          </p>
        </div>
      ) : (
        <div className="max-h-[300px] space-y-1.5 overflow-y-auto border-t border-[var(--line)] px-3 py-2.5">
          {selections.map((s) => (
            <Leg
              key={s.projectionId}
              s={s}
              onToggle={(pickType) => {
                if (pickType !== s.pickType) toggle({ ...s, pickType });
              }}
              onRemove={() => remove(s.projectionId)}
            />
          ))}
        </div>
      )}

      {/* Entry + submit */}
      <div className="space-y-2.5 border-t border-[var(--line)] px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--line-strong)] bg-[var(--card)] px-3 py-2">
            <label
              htmlFor="entry-amount"
              className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-faint)]"
            >
              Entry
            </label>
            <input
              id="entry-amount"
              type="number"
              min={1}
              inputMode="numeric"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              className="num w-full bg-transparent text-lg font-black text-foreground outline-none"
            />
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
              To Win
            </span>
            <span className="num block text-lg font-black text-[var(--accent)]">
              {multiplier ? formatCredits(toWin) : "—"}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setWager(String(a))}
              className={`num h-7 flex-1 rounded-md text-[11px] font-bold transition-colors ${
                stake === a
                  ? "bg-foreground text-background"
                  : "bg-[var(--card-2)] text-[var(--text-muted)] hover:text-foreground"
              }`}
            >
              {formatCredits(a)}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-md bg-[var(--less)]/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--less)]">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md bg-[var(--win)]/10 px-2.5 py-1.5 text-center text-xs font-bold text-[var(--win)]">
            Lineup submitted — track it in Lineups.
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={place}
          className="h-12 w-full rounded-lg bg-[var(--accent)] font-display text-sm font-extrabold uppercase tracking-wide text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--card-2)] disabled:text-[var(--text-faint)]"
        >
          {submitting
            ? "Submitting…"
            : count < MIN_PICKS
            ? `Pick ${MIN_PICKS - count} more`
            : `Submit · ${multiplier}x payout`}
        </button>
        <p className="text-center text-[10px] text-[var(--text-faint)]">
          Power play — all picks must hit. Play-money Credits.
        </p>
      </div>
    </div>
  );
}
