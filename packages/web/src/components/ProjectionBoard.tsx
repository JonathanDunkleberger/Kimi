import React from "react";
import dayjs from "dayjs";
import { useProjections, type Projection } from "@/lib/api";
import { useBetSlip } from "@/store/betSlipStore";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { ChevronDown, ChevronUp, Lock, RefreshCw } from "lucide-react";

type GameTab = "VALORANT" | "COD";
type ScopeFilter = "ALL" | "SERIES" | "MAP";

const GAME_TABS: { id: GameTab; label: string }[] = [
  { id: "VALORANT", label: "Valorant" },
  { id: "COD", label: "Call of Duty" },
];

/* ------------------------------------------------------------------ */
/* PropCard — compact, headshot-dominant, Less/More as primary CTAs   */
/* ------------------------------------------------------------------ */

function PropCard({ p }: { p: Projection }) {
  const { selections, toggle } = useBetSlip();
  const selected = selections.find((s) => s.projectionId === p.id);
  const locked = !p.isOpen;
  const live = p.match.status === "LIVE";

  const opponent =
    p.player.team === p.match.teamA ? p.match.teamB : p.match.teamA;
  const matchLabel = `${p.match.teamA} vs ${p.match.teamB}`;
  const scopeLabel =
    p.scope === "MAP" && p.mapNumber > 0 ? `Map ${p.mapNumber}` : "Series";

  const select = (pickType: "MORE" | "LESS") => {
    if (locked) return;
    toggle({
      projectionId: p.id,
      pickType,
      player: p.player.name,
      team: p.player.team,
      imageUrl: p.player.imageUrl,
      statType: p.statType,
      value: p.value,
      scope: p.scope,
      mapNumber: p.mapNumber,
      matchLabel,
      game: p.match.game,
    });
  };

  return (
    <article
      className={`prop-card relative flex flex-col overflow-hidden rounded-xl border bg-[var(--card)] ${
        selected ? "is-selected" : "border-[var(--line)]"
      }`}
    >
      {live && (
        <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded bg-[var(--live)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
          <span className="live-dot h-1 w-1 rounded-full bg-white" />
          Live
        </span>
      )}

      <div
        className={`flex flex-1 flex-col items-center px-2 pt-3.5 text-center ${
          locked ? "opacity-45" : ""
        }`}
      >
        <PlayerAvatar
          name={p.player.name}
          team={p.player.team}
          imageUrl={p.player.imageUrl}
          size={60}
          rounded="full"
        />
        <h3 className="mt-2 w-full truncate px-1 font-display text-[13px] font-bold leading-tight text-foreground">
          {p.player.name}
        </h3>
        <p className="w-full truncate px-1 text-[10px] font-medium text-[var(--text-muted)]">
          {p.player.team} · vs {opponent}
        </p>
        <p className="text-[10px] text-[var(--text-faint)]">
          {live ? "In progress" : dayjs(p.match.scheduledAt).format("ddd h:mm A")}
        </p>

        <div className="mt-2 flex items-baseline justify-center gap-1.5 pb-3">
          <span className="num text-[26px] font-black leading-none text-foreground">
            {p.value}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {p.statType}
            {p.scope === "MAP" ? ` · ${scopeLabel}` : ""}
          </span>
        </div>
      </div>

      {locked ? (
        <div className="flex h-10 items-center justify-center gap-1.5 border-t border-[var(--line)] bg-[var(--card-2)] text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
          <Lock className="h-3 w-3" />
          Locked
        </div>
      ) : (
        <div className="grid grid-cols-2 border-t border-[var(--line)]">
          <button
            type="button"
            aria-pressed={selected?.pickType === "LESS"}
            onClick={() => select("LESS")}
            className={`flex h-10 items-center justify-center gap-1 border-r border-[var(--line)] text-xs font-extrabold uppercase tracking-wide transition-colors duration-150 ${
              selected?.pickType === "LESS"
                ? "bg-[var(--less)] text-white"
                : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--card-2)] hover:text-foreground active:bg-[var(--card-2)]"
            }`}
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={3} />
            Less
          </button>
          <button
            type="button"
            aria-pressed={selected?.pickType === "MORE"}
            onClick={() => select("MORE")}
            className={`flex h-10 items-center justify-center gap-1 text-xs font-extrabold uppercase tracking-wide transition-colors duration-150 ${
              selected?.pickType === "MORE"
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--card-2)] hover:text-foreground active:bg-[var(--card-2)]"
            }`}
          >
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={3} />
            More
          </button>
        </div>
      )}
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse flex-col items-center rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 pt-3.5">
      <div className="h-[60px] w-[60px] rounded-full bg-[var(--card-2)]" />
      <div className="mt-2.5 h-3 w-20 rounded bg-[var(--card-2)]" />
      <div className="mt-1.5 h-2.5 w-24 rounded bg-[var(--card-2)]" />
      <div className="my-3 h-6 w-16 rounded bg-[var(--card-2)]" />
      <div className="mb-0 h-10 w-full rounded-t bg-[var(--card-2)]/60" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter chip                                                        */
/* ------------------------------------------------------------------ */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[11px] font-bold uppercase tracking-wide transition-colors duration-150 ${
        active
          ? "bg-foreground text-background"
          : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--card-2)] hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Board                                                              */
/* ------------------------------------------------------------------ */

export default function ProjectionBoard() {
  const { projections, isLoading, error, refresh } = useProjections();
  const [game, setGame] = React.useState<GameTab>("VALORANT");
  const [scope, setScope] = React.useState<ScopeFilter>("ALL");
  const [stat, setStat] = React.useState<string>("ALL");
  const [matchId, setMatchId] = React.useState<string>("ALL");

  React.useEffect(() => {
    setMatchId("ALL");
    setStat("ALL");
    setScope("ALL");
  }, [game]);

  const gameProjections = React.useMemo(
    () => projections.filter((p) => p.match.game === game),
    [projections, game]
  );

  const matches = React.useMemo(() => {
    const map = new Map<string, Projection["match"]>();
    for (const p of gameProjections) map.set(p.match.id, p.match);
    return Array.from(map.values()).sort(
      (a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)
    );
  }, [gameProjections]);

  const stats = React.useMemo(() => {
    const set = new Set(gameProjections.map((p) => p.statType));
    return Array.from(set).sort();
  }, [gameProjections]);

  const filtered = gameProjections.filter((p) => {
    if (scope !== "ALL" && p.scope !== scope) return false;
    if (stat !== "ALL" && p.statType !== stat) return false;
    if (matchId !== "ALL" && p.match.id !== matchId) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    const t = +new Date(a.match.scheduledAt) - +new Date(b.match.scheduledAt);
    if (t !== 0) return t;
    if (a.mapNumber !== b.mapNumber) return a.mapNumber - b.mapNumber;
    return a.player.name.localeCompare(b.player.name);
  });

  const openCount = gameProjections.filter((p) => p.isOpen).length;

  return (
    <div className="animate-fade space-y-3">
      {/* Game tabs — exclusive, like sports on PrizePicks */}
      <div className="flex items-center gap-2">
        {GAME_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setGame(tab.id)}
            className={`h-10 rounded-lg px-5 font-display text-sm font-extrabold uppercase tracking-wide transition-colors duration-150 ${
              game === tab.id
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--card-2)] hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[11px] font-semibold text-[var(--text-faint)] sm:block">
            {openCount} open
          </span>
          <button
            type="button"
            onClick={() => refresh()}
            aria-label="Refresh board"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--text-muted)] transition-colors hover:bg-[var(--card-2)] hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stat + scope chips */}
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 md:mx-0 md:px-0">
        <Chip active={stat === "ALL"} onClick={() => setStat("ALL")}>
          All
        </Chip>
        {stats.map((s) => (
          <Chip key={s} active={stat === s} onClick={() => setStat(s)}>
            {s}
          </Chip>
        ))}
        <span className="mx-1 my-1.5 w-px shrink-0 bg-[var(--line-strong)]" />
        <Chip active={scope === "SERIES"} onClick={() => setScope(scope === "SERIES" ? "ALL" : "SERIES")}>
          Series
        </Chip>
        <Chip active={scope === "MAP"} onClick={() => setScope(scope === "MAP" ? "ALL" : "MAP")}>
          Maps
        </Chip>
      </div>

      {/* Match chips */}
      {matches.length > 1 && (
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 md:mx-0 md:px-0">
          <Chip active={matchId === "ALL"} onClick={() => setMatchId("ALL")}>
            All Matches
          </Chip>
          {matches.map((m) => (
            <Chip
              key={m.id}
              active={matchId === m.id}
              onClick={() => setMatchId(m.id)}
            >
              {m.status === "LIVE" && (
                <span className="live-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--live)] align-middle" />
              )}
              {m.teamA} vs {m.teamB}
            </Chip>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--less)]/40 bg-[var(--less)]/10 px-3 py-2.5 text-sm text-foreground">
          Couldn&apos;t load the board — retrying. If this persists, the API is
          waking up.
        </p>
      )}

      {/* Card grid — 2-col mobile minimum */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4 2xl:grid-cols-5">
        {isLoading && sorted.length === 0
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          : sorted.map((p) => <PropCard key={p.id} p={p} />)}
      </div>

      {!isLoading && sorted.length === 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] py-14 text-center">
          <p className="font-display text-sm font-bold text-foreground">
            No props here right now
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Try a different stat or match filter.
          </p>
        </div>
      )}
    </div>
  );
}
