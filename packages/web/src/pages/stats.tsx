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
  const [game, setGame] = React.useState<"VALORANT" | "COD">("VALORANT");
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
        className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${
          active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
        }`}
      >
        {label}
        {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </button>
    );
  }

  return (
    <div className="animate-fade space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
          Stats
        </h1>
        {(
          [
            { id: "VALORANT" as const, label: "Valorant" },
            { id: "COD" as const, label: "Call of Duty" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setGame(tab.id)}
            className={`h-9 rounded-lg px-4 font-display text-xs font-extrabold uppercase tracking-wide transition-colors ${
              game === tab.id
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "bg-[var(--card)] text-[var(--text-muted)] hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto hidden text-[11px] text-[var(--text-faint)] sm:block">
          {sourceLabel(sources)} · updated {formatUpdated(updatedAt)}
        </span>
      </div>

      {isLoading && (
        <p className="text-sm text-[var(--text-muted)]">Loading stats…</p>
      )}

      {!isLoading && sorted.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          No stats for this filter yet.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--card)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                #
              </th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Player
              </th>
              <th className="px-3 py-2.5">
                <SortBtn label="Maps" k="maps" />
              </th>
              <th className="px-3 py-2.5">
                <SortBtn label="K/D" k="kd" />
              </th>
              <th className="px-3 py-2.5">
                <SortBtn label="Rating" k="rating" />
              </th>
              <th className="px-3 py-2.5">
                <SortBtn label={game === "COD" ? "DMG" : "ACS"} k="acsDmg" />
              </th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                HS%
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr
                key={p.playerId}
                className="border-b border-[var(--line)]/50 transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="num px-3 py-2 text-xs font-bold text-[var(--text-faint)]">
                  {i + 1}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar
                      name={p.name}
                      team={p.team}
                      imageUrl={p.imageUrl}
                      size={32}
                    />
                    <div>
                      <div className="text-[13px] font-bold leading-tight text-foreground">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {p.team}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="num px-3 py-2 text-[13px]">{p.maps}</td>
                <td className="num px-3 py-2 text-[13px] text-[var(--text-muted)]">
                  {kd(p).toFixed(2)}
                </td>
                <td className="num px-3 py-2 text-[13px] font-black text-[var(--accent)]">
                  {p.rating.toFixed(2)}
                </td>
                <td className="num px-3 py-2 text-[13px]">
                  {p.acs ?? p.damage ?? "—"}
                </td>
                <td className="num px-3 py-2 text-[13px] text-[var(--text-muted)]">
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
