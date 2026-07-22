import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBetSlip } from "@/store/betSlipStore";
import { useAuth } from "@/lib/authClient";
import { createEntry } from "@/lib/api";
import {
  getMultiplier,
  MIN_PICKS,
  MAX_PICKS,
  MULTIPLIERS,
  formatCrowns,
} from "@/lib/multipliers";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { Trash2, X } from "lucide-react";

export default function BetSlip({ embedded = false }: { embedded?: boolean }) {
  const { selections, remove, clear, toggle } = useBetSlip();
  const { getToken, isSignedIn } = useAuth();
  const [wager, setWager] = React.useState("1000");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const multiplier = getMultiplier(selections.length);
  const stake = Number(wager) || 0;
  const toWin = stake * multiplier;
  const canSubmit = selections.length >= MIN_PICKS && stake > 0 && !submitting;

  const place = async () => {
    setError(null);
    setSuccess(false);
    if (!canSubmit) {
      setError(`Add at least ${MIN_PICKS} picks`);
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
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e?.message || "Failed to submit lineup");
    } finally {
      setSubmitting(false);
    }
  };

  const slots = Array.from({ length: MAX_PICKS }, (_, i) => selections[i] || null);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-[var(--panel)] ${
        embedded ? "" : "shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Lineup
          </p>
          <h2 className="font-display text-xl font-extrabold text-foreground">
            {selections.length}/{MAX_PICKS} picks
          </h2>
        </div>
        {selections.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Multiplier ladder */}
      <div className="grid grid-cols-5 gap-1 border-b border-border px-3 py-2.5">
        {[2, 3, 4, 5, 6].map((n) => {
          const active = selections.length === n;
          const unlocked = selections.length >= n;
          return (
            <div
              key={n}
              className={`rounded-lg px-1 py-1.5 text-center ${
                active
                  ? "bg-[var(--lime)] text-primary-foreground"
                  : unlocked
                  ? "bg-[var(--panel-2)] text-foreground"
                  : "bg-transparent text-muted-foreground/50"
              }`}
            >
              <div className="text-[9px] font-bold uppercase tracking-wide">{n} picks</div>
              <div className="font-display text-sm font-extrabold">{MULTIPLIERS[n]}x</div>
            </div>
          );
        })}
      </div>

      {selections.length === 0 ? (
        <div className="space-y-2 px-5 py-10 text-center">
          <p className="font-display text-lg font-bold text-foreground">Empty lineup</p>
          <p className="text-sm text-muted-foreground">
            Tap More or Less on the board. Stack 2–{MAX_PICKS} picks to unlock
            payouts — play-money Credits only.
          </p>
        </div>
      ) : (
        <div className="max-h-[380px] space-y-2 overflow-y-auto px-3 py-3">
          {slots.map((s, i) =>
            s ? (
              <div
                key={s.projectionId}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-[var(--panel-2)] p-2.5"
              >
                <PlayerAvatar
                  name={s.player}
                  team={s.team}
                  imageUrl={s.imageUrl}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-foreground">{s.player}</span>
                    <button
                      type="button"
                      onClick={() =>
                        toggle({
                          ...s,
                          pickType: s.pickType === "MORE" ? "LESS" : "MORE",
                        })
                      }
                      className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        s.pickType === "MORE"
                          ? "bg-[var(--lime)]/20 text-[var(--lime)]"
                          : "bg-[var(--coral)]/20 text-[var(--coral)]"
                      }`}
                    >
                      {s.pickType}
                    </button>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {s.statType} {s.value}
                    {s.scope === "MAP" ? ` · M${s.mapNumber}` : " · Series"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.projectionId)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                key={`empty-${i}`}
                className="flex h-[58px] items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground/60"
              >
                Pick {i + 1}
              </div>
            )
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-border px-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Multiplier</span>
          <span className="font-display text-2xl font-extrabold text-[var(--lime)]">
            {multiplier ? `${multiplier}x` : "—"}
          </span>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Entry (Credits)
          </label>
          <Input
            type="number"
            min={1}
            value={wager}
            onChange={(e) => setWager(e.target.value)}
            className="border-border bg-[var(--panel-2)] font-mono text-foreground"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 px-3 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            To Win
          </span>
          <span className="font-display text-2xl font-extrabold text-[var(--lime)]">
            {formatCrowns(toWin)}
          </span>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && (
          <p className="animate-stamp text-center font-display text-sm font-bold text-[var(--win)]">
            Lineup locked in.
          </p>
        )}

        <Button
          disabled={!canSubmit}
          onClick={place}
          className="h-12 w-full bg-[var(--lime)] font-display text-base font-extrabold tracking-wide text-primary-foreground hover:bg-[var(--gold-bright)]"
        >
          {submitting ? "Submitting…" : "Submit Lineup"}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Power play · all picks must hit · 2→3x · 3→5x · 4→10x · 5→20x · 6→25x
        </p>
      </div>
    </div>
  );
}
