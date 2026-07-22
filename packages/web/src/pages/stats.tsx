import React from "react";
import { useStats } from "@/lib/api";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

export default function StatsPage() {
  const [game, setGame] = React.useState<"ALL" | "VALORANT" | "COD">("ALL");
  const { players, isLoading } = useStats(game);

  return (
    <div className="animate-fade-rise space-y-6">
      <section className="rounded-2xl border border-filigree bg-hearth px-5 py-6 md:px-7">
        <p className="font-serif text-sm italic text-muted-foreground">
          A cleaner chronicle than the ad-choked wilds — rolls kept for the club
        </p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-[0.08em] text-gold-bright md:text-4xl">
          The Chronicle
        </h1>
        <div className="rune-rule mt-4" />
      </section>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "VALORANT", "COD"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGame(g)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              game === g
                ? "border-gold/50 bg-gold/15 text-gold-bright"
                : "border-border text-muted-foreground"
            }`}
          >
            {g === "ALL" ? "All Realms" : g === "COD" ? "Call of Duty" : "Valorant"}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="font-serif italic text-muted-foreground">Illuminating the rolls…</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-filigree bg-hearth">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Player</th>
              <th className="px-4 py-3 font-semibold">Game</th>
              <th className="px-4 py-3 font-semibold">Maps</th>
              <th className="px-4 py-3 font-semibold">K / D / A</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">ACS / DMG</th>
              <th className="px-4 py-3 font-semibold">HS%</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr
                key={p.playerId}
                className="border-b border-border/40 transition hover:bg-moss/40"
              >
                <td className="px-4 py-3 font-display text-gold">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar
                      name={p.name}
                      team={p.team}
                      imageUrl={p.imageUrl}
                      size={40}
                    />
                    <div>
                      <div className="font-semibold text-parchment">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.team}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-bold uppercase text-leaf-bright">
                  {p.game === "COD" ? "CoD" : "VAL"}
                </td>
                <td className="px-4 py-3 tabular-nums">{p.maps}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {p.kills} / {p.deaths} / {p.assists}
                </td>
                <td className="px-4 py-3 font-display text-gold-bright">{p.rating.toFixed(2)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {p.acs ?? p.damage ?? "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">{p.hsPercent?.toFixed(1) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
