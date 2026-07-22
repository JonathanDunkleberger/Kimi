import React from "react";
import dayjs from "dayjs";
import { useProjections, type Projection } from "@/lib/api";
import { useBetSlip } from "@/store/betSlipStore";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Lock, RefreshCw } from "lucide-react";
import { MAX_PICKS } from "@/lib/multipliers";

type GameTab = "VALORANT" | "COD";
type ScopeFilter = "ALL" | "SERIES" | "MAP";

function PropCard({ p }: { p: Projection }) {
  const { selections, toggle } = useBetSlip();
  const selected = selections.find((s) => s.projectionId === p.id);
  const locked = !p.isOpen;
  const atCap = !selected && selections.length >= MAX_PICKS;

  const matchLabel = `${p.match.teamA} vs ${p.match.teamB}`;
  const scopeLabel =
    p.scope === "MAP" && p.mapNumber > 0 ? `Map ${p.mapNumber}` : "Series";

  const select = (pickType: "MORE" | "LESS") => {
    if (locked || atCap) return;
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
      className={`prop-card relative flex flex-col overflow-hidden rounded-2xl border border-border bg-[var(--panel)] ${
        selected ? "is-selected" : ""
      } ${locked || atCap ? "opacity-60" : ""}`}
    >
      {p.match.status === "LIVE" && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[var(--live)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
          Live
        </div>
      )}

      <div className="flex flex-col items-center px-4 pb-2 pt-5">
        <PlayerAvatar
          name={p.player.name}
          team={p.player.team}
          imageUrl={p.player.imageUrl}
          size={96}
          rounded="full"
        />
        <h3 className="mt-3 w-full truncate text-center font-display text-lg font-extrabold text-foreground">
          {p.player.name}
        </h3>
        <p className="truncate text-center text-xs text-muted-foreground">
          {p.player.team}
          {p.player.role ? ` · ${p.player.role}` : ""}
        </p>
        <p className="mt-1 truncate text-center text-[11px] text-muted-foreground/80">
          {matchLabel}
        </p>
      </div>

      <div className="px-4 pb-1 text-center">
        <div className="font-display text-[2.75rem] font-extrabold leading-none tracking-tight text-foreground">
          {p.value}
        </div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {p.statType}
          {" · "}
          {scopeLabel}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {dayjs(p.match.scheduledAt).format("ddd · h:mm A")}
          {" · "}
          <span className={locked ? "text-[var(--coral)]" : "text-[var(--win)]"}>
            {p.availability}
          </span>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 p-3 pt-3">
        <button
          type="button"
          disabled={locked || atCap}
          onClick={() => select("LESS")}
          className={`flex h-12 items-center justify-center rounded-xl text-sm font-extrabold uppercase tracking-wide transition ${
            selected?.pickType === "LESS"
              ? "bg-[var(--coral)] text-white"
              : "bg-[var(--panel-2)] text-muted-foreground hover:bg-[var(--coral)]/20 hover:text-[var(--coral)]"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {locked ? <Lock className="mr-1 h-3.5 w-3.5" /> : null}
          Less
        </button>
        <button
          type="button"
          disabled={locked || atCap}
          onClick={() => select("MORE")}
          className={`flex h-12 items-center justify-center rounded-xl text-sm font-extrabold uppercase tracking-wide transition ${
            selected?.pickType === "MORE"
              ? "bg-[var(--lime)] text-primary-foreground"
              : "bg-[var(--panel-2)] text-muted-foreground hover:bg-[var(--lime)]/20 hover:text-[var(--lime)]"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {locked ? <Lock className="mr-1 h-3.5 w-3.5" /> : null}
          More
        </button>
      </div>
    </article>
  );
}

export default function ProjectionBoard() {
  const { projections, isLoading, error, refresh } = useProjections();
  const [game, setGame] = React.useState<GameTab>("VALORANT");
  const [scope, setScope] = React.useState<ScopeFilter>("ALL");
  const [stat, setStat] = React.useState<string>("ALL");
  const [matchId, setMatchId] = React.useState<string>("ALL");
  const [showLocked, setShowLocked] = React.useState(true);

  React.useEffect(() => {
    setMatchId("ALL");
    setStat("ALL");
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
    if (!showLocked && !p.isOpen) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    return a.player.name.localeCompare(b.player.name);
  });

  const Chip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
        active
          ? "border-[var(--lime)]/50 bg-[var(--lime)]/15 text-[var(--lime)]"
          : "border-border bg-transparent text-muted-foreground hover:border-white/20 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="animate-fade-rise space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Player props · play-money credits
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Build your lineup
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick More or Less on 2–6 projections. More legs = bigger multiplier,
            lower hit chance.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          className="gap-2 border-border"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </section>

      {/* Primary game tabs — Valorant OR COD, never a mixed “all” board */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-[var(--panel)] p-1.5">
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
            className={`rounded-xl px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wide transition md:text-base ${
              game === tab.id
                ? "bg-[var(--lime)] text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          <Chip active={scope === "ALL"} onClick={() => setScope("ALL")}>
            All
          </Chip>
          <Chip active={scope === "SERIES"} onClick={() => setScope("SERIES")}>
            Series
          </Chip>
          <Chip active={scope === "MAP"} onClick={() => setScope("MAP")}>
            By Map
          </Chip>
          <Chip active={showLocked} onClick={() => setShowLocked((v) => !v)}>
            {showLocked ? "Show Locked" : "Open Only"}
          </Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={stat === "ALL"} onClick={() => setStat("ALL")}>
            All Stats
          </Chip>
          {stats.map((s) => (
            <Chip key={s} active={stat === s} onClick={() => setStat(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={matchId === "ALL"} onClick={() => setMatchId("ALL")}>
            All Matches
          </Chip>
          {matches.map((m) => (
            <Chip
              key={m.id}
              active={matchId === m.id}
              onClick={() => setMatchId(m.id)}
            >
              {m.teamA} vs {m.teamB}
              {m.status === "LIVE" ? " · LIVE" : ""}
            </Chip>
          ))}
        </div>
      </div>

      {matches.some((m) => m.status === "LIVE") && (
        <div className="rounded-xl border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-4 py-3 text-sm text-foreground">
          <strong className="text-[var(--coral)]">Live series:</strong> later
          map props unlock after the previous map ends — and only if the series
          still needs that map.
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading projections…</p>
      )}
      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load the board. Run <code className="font-mono">pnpm dev:api</code>{" "}
          locally or wait for the API to wake.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {sorted.map((p) => (
          <PropCard key={p.id} p={p} />
        ))}
      </div>

      {!isLoading && sorted.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          No {game === "COD" ? "Call of Duty" : "Valorant"} props match these
          filters.
        </p>
      )}
    </div>
  );
}
