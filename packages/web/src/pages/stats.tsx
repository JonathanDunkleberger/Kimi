import React from "react";
import { useStats, type StatRow } from "@/lib/api";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

type SortKey = "rating" | "acsDmg" | "kd" | "maps";

function sourceLabel(sources: string[]): string {
  const map: Record<string, string> = {
    vlr: "VLR",
    breakingpoint: "Breaking Point",
    vct_history: "VCT archive",
    demo: "demo",
  };
  const parts = (sources.length ? sources : ["demo"]).map((s) => map[s] || s);
  return parts.join(" · ");
}

function formatUpdated(iso: string | null | undefined): string {
  if (!iso) return "pending";
  try {
    return new Date(iso).toLocaleString(undefined, {
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
  const [game, setGame] = React.useState<"ALL" | "VALORANT" | "COD">("VALORANT");
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

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 font-semibold uppercase tracking-[0.15em] ${
          active ? "text-[var(--lime)]" : "text-muted-foreground"
        }`}
      >
        {label}
        {active ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
      </button>
    );
  }

  return (
    <div className="animate-fade-rise space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Player stats · {sourceLabel(sources)} · updated {formatUpdated(updatedAt)}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Stats
        </h1>
      </section>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-[var(--panel)] p-1.5 sm:max-w-md">
        {(
          [
            { id: "VALORANT" as const, label: "Valorant" },
            { id: "COD" as const, label: "CoD" },
            { id: "ALL" as const, label: "All" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setGame(tab.id)}
            className={`rounded-xl px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide transition ${
              game === tab.id
                ? "bg-[var(--lime)] text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading stats…</p>}

      {!isLoading && sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">No stats for this filter yet.</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-[var(--panel)]">
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
                className="border-b border-border/40 transition hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 font-display text-[var(--lime)]">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar
                      name={p.name}
                      team={p.team}
                      imageUrl={p.imageUrl}
                      size={40}
                    />
                    <div>
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.team}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-bold uppercase text-[var(--sky)]">
                  {p.game === "COD" ? "CoD" : "VAL"}
                </td>
                <td className="px-4 py-3 tabular-nums">{p.maps}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {p.kills} / {p.deaths}
                  <span className="ml-1 text-[10px] text-muted-foreground/80">
                    ({kd(p).toFixed(2)})
                  </span>
                </td>
                <td className="px-4 py-3 font-display font-bold text-[var(--lime)]">
                  {p.rating.toFixed(2)}
                </td>
                <td className="px-4 py-3 tabular-nums">{p.acs ?? p.damage ?? "—"}</td>
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
