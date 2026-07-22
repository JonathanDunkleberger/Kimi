import React from "react";
import { useStats, type StatRow } from "@/lib/api";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

type SortKey = "rating" | "acsDmg" | "kd" | "maps";

function sourceLabel(sources: string[]): string {
  const map: Record<string, string> = {
    vlr: "VLR",
    breakingpoint: "Breaking Point",
    vct_history: "VCT archive",
    demo: "demo slate",
  };
  const parts = (sources.length ? sources : ["demo"]).map((s) => map[s] || s);
  return parts.join(" · ");
}

function formatUpdated(iso: string | null | undefined): string {
  if (!iso) return "awaiting first illumination";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function kd(p: StatRow): number {
  if (!p.deaths) return p.kills;
  return p.kills / p.deaths;
}

function acsOrDmg(p: StatRow): number {
  return p.acs ?? p.damage ?? 0;
}

export default function StatsPage() {
  const [game, setGame] = React.useState<"ALL" | "VALORANT" | "COD">("ALL");
  const [sortKey, setSortKey] = React.useState<SortKey>("rating");
  const [sortDir, setSortDir] = React.useState<"desc" | "asc">("desc");
  const { players, isLoading, updatedAt, sources } = useStats(game);

  const sorted = React.useMemo(() => {
    const rows = [...players];
    const pick = (p: StatRow) => {
      if (sortKey === "rating") return p.rating;
      if (sortKey === "maps") return p.maps;
      if (sortKey === "kd") return kd(p);
      return acsOrDmg(p);
    };
    rows.sort((a, b) => {
      const diff = pick(a) - pick(b);
      if (diff === 0) return b.rating - a.rating;
      return sortDir === "desc" ? -diff : diff;
    });
    return rows;
  }, [players, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortBtn({
    label,
    k,
  }: {
    label: string;
    k: SortKey;
  }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 font-semibold uppercase tracking-[0.15em] ${
          active ? "text-gold-bright" : "text-muted-foreground"
        }`}
      >
        {label}
        {active ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
      </button>
    );
  }

  return (
    <div className="animate-fade-rise space-y-6">
      <section className="rounded-2xl border border-filigree bg-hearth px-5 py-6 md:px-7">
        <p className="font-serif text-sm italic text-muted-foreground">
          A cleaner chronicle than the ad-choked wilds — rolls kept for the club
        </p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-[0.08em] text-gold-bright md:text-4xl">
          The Chronicle
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Drawn from {sourceLabel(sources)} · updated {formatUpdated(updatedAt)}
        </p>
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

      {!isLoading && sorted.length === 0 && (
        <p className="font-serif italic text-muted-foreground">
          The chronicle is blank — the scribes have not yet returned.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-filigree bg-hearth">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.15em]">
              <th className="px-4 py-3 font-semibold text-muted-foreground">#</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Player</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Game</th>
              <th className="px-4 py-3">
                <SortBtn label="Maps" k="maps" />
              </th>
              <th className="px-4 py-3">
                <SortBtn label="K / D" k="kd" />
              </th>
              <th className="px-4 py-3">
                <SortBtn label="Rating" k="rating" />
              </th>
              <th className="px-4 py-3">
                <SortBtn label="ACS / DMG" k="acsDmg" />
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">HS%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
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
                  {p.kills} / {p.deaths}
                  <span className="ml-1 text-[10px] text-muted-foreground/80">
                    ({kd(p).toFixed(2)})
                  </span>
                </td>
                <td className="px-4 py-3 font-display text-gold-bright">
                  {p.rating.toFixed(2)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {p.acs ?? p.damage ?? "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {p.hsPercent != null ? p.hsPercent.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
