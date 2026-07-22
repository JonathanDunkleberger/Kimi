import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBetSlip } from "@/store/betSlipStore";
import { useAuth } from "@/lib/authClient";
import { createEntry } from "@/lib/api";
import { getMultiplier, MIN_PICKS, formatCrowns } from "@/lib/multipliers";
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
      setError(`Pick at least ${MIN_PICKS} legs`);
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
      setError(e?.message || "Failed to lock slip");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-filigree bg-hearth ${
        embedded ? "" : "glow-gold"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Club Parchment
          </p>
          <h2 className="font-display text-xl text-gold-bright">
            {selections.length} {selections.length === 1 ? "Mark" : "Marks"}
          </h2>
        </div>
        {selections.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selections.length === 0 ? (
        <div className="space-y-2 px-5 py-10 text-center">
          <p className="font-display text-lg text-parchment">Empty parchment</p>
          <p className="font-serif text-sm italic text-muted-foreground">
            Tap More or Less on The Lists. {MIN_PICKS}+ Marks unlock the
            multiplier — Crowns only, never real stakes.
          </p>
        </div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto px-3 py-3">
          {selections.map((s) => (
            <div
              key={s.projectionId}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-ink/50 p-2.5"
            >
              <PlayerAvatar
                name={s.player}
                team={s.team}
                imageUrl={s.imageUrl}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-parchment">{s.player}</span>
                  <button
                    type="button"
                    onClick={() =>
                      toggle({ ...s, pickType: s.pickType === "MORE" ? "LESS" : "MORE" })
                    }
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      s.pickType === "MORE"
                        ? "bg-ember/20 text-ember"
                        : "bg-frost/20 text-frost"
                    }`}
                  >
                    {s.pickType}
                  </button>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {s.statType} {s.value}
                  {s.scope === "MAP" ? ` · M${s.mapNumber}` : " · Series"} · {s.game}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(s.projectionId)}
                className="text-muted-foreground hover:text-parchment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t border-border px-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Multiplier</span>
          <span className="font-display text-xl text-gold-bright">
            {multiplier ? `${multiplier}x` : "—"}
          </span>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Wager (Crowns)
          </label>
          <Input
            type="number"
            min={1}
            value={wager}
            onChange={(e) => setWager(e.target.value)}
            className="border-gold/20 bg-ink/60 font-mono text-parchment"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gold/25 bg-gold/10 px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            To Win
          </span>
          <span className="font-display text-2xl text-gold-bright">
            {formatCrowns(toWin)}
          </span>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && (
          <p className="animate-stamp text-center font-display text-sm text-leaf-bright">
            Sealed. The club will remember this slip.
          </p>
        )}

        <Button
          disabled={!canSubmit}
          onClick={place}
          className="h-12 w-full bg-gold font-display text-base font-bold tracking-wide text-primary-foreground hover:bg-gold-bright"
        >
          {submitting ? "Sealing…" : "Seal the Slip"}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Play-money Crowns · 2→3x · 3→5x · 4→10x · 5→20x · 6→25x
        </p>
      </div>
    </div>
  );
}
