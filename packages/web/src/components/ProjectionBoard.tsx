import React from "react";
import dayjs from "dayjs";
import { useProjections, type Projection } from "@/lib/api";
import { useBetSlip } from "@/store/betSlipStore";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Lock, RefreshCw } from "lucide-react";

type GameFilter = "ALL" | "VALORANT" | "COD";
type ScopeFilter = "ALL" | "SERIES" | "MAP";

function PropCard({ p }: { p: Projection }) {
  const { selections, toggle } = useBetSlip();
  const selected = selections.find((s) => s.projectionId === p.id);
  const locked = !p.isOpen;

  const matchLabel = `${p.match.teamA} vs ${p.match.teamB}`;
  const scopeLabel =
    p.scope === "MAP" && p.mapNumber > 0
      ? `Map ${p.mapNumber}`
      : "Series";

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
      className={`prop-card relative flex flex-col overflow-hidden rounded-2xl border border-filigree bg-hearth ${
        selected ? "is-selected" : ""
      } ${locked ? "opacity-70" : ""}`}
    >
      {p.match.status === "LIVE" && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-blood/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
          Live
        </div>
      )}

      <div className="flex items-start gap-3 p-4 pb-2">
        <PlayerAvatar
          name={p.player.name}
          team={p.player.team}
          imageUrl={p.player.imageUrl}
          size={72}
        />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-moss px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-leaf-bright">
              {p.match.game === "COD" ? "CoD" : "VAL"}
            </span>
            <span className="rounded-md border border-gold/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
              {scopeLabel}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {p.match.format}
            </span>
          </div>
          <h3 className="mt-1 truncate font-display text-lg font-bold text-parchment">
            {p.player.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {p.player.team}
            {p.player.role ? ` · ${p.player.role}` : ""}
          </p>
          <p className="mt-1 truncate font-serif text-sm italic text-muted-foreground">
            {matchLabel}
          </p>
        </div>
      </div>

      <div className="px-4 pb-1 text-center">
        <div className="font-display text-4xl font-black tracking-tight text-gold-bright">
          {p.value}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {p.statType}
          {p.scope === "MAP" && p.mapNumber > 0 ? ` · Map ${p.mapNumber}` : ""}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {dayjs(p.match.scheduledAt).format("ddd · h:mm A")}
          {" · "}
          <span className={locked ? "text-ember" : "text-leaf-bright"}>
            {p.availability}
          </span>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 p-3 pt-2">
        <button
          type="button"
          disabled={locked}
          onClick={() => select("LESS")}
          className={`flex h-11 items-center justify-center rounded-xl border text-sm font-bold uppercase tracking-wide transition ${
            selected?.pickType === "LESS"
              ? "border-frost bg-frost/20 text-frost"
              : "border-border bg-ink/40 text-muted-foreground hover:border-frost/50 hover:text-frost"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {locked ? <Lock className="mr-1 h-3.5 w-3.5" /> : null}
          Less
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => select("MORE")}
          className={`flex h-11 items-center justify-center rounded-xl border text-sm font-bold uppercase tracking-wide transition ${
            selected?.pickType === "MORE"
              ? "border-ember bg-ember/20 text-ember"
              : "border-border bg-ink/40 text-muted-foreground hover:border-ember/50 hover:text-ember"
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
  const [game, setGame] = React.useState<GameFilter>("ALL");
  const [scope, setScope] = React.useState<ScopeFilter>("ALL");
  const [stat, setStat] = React.useState<string>("ALL");
  const [matchId, setMatchId] = React.useState<string>("ALL");
  const [showLocked, setShowLocked] = React.useState(true);

  const matches = React.useMemo(() => {
    const map = new Map<string, Projection["match"]>();
    for (const p of projections) map.set(p.match.id, p.match);
    return Array.from(map.values()).sort(
      (a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)
    );
  }, [projections]);

  const stats = React.useMemo(() => {
    const set = new Set(projections.map((p) => p.statType));
    return Array.from(set).sort();
  }, [projections]);

  const filtered = projections.filter((p) => {
    if (game !== "ALL" && p.match.game !== game) return false;
    if (scope !== "ALL" && p.scope !== scope) return false;
    if (stat !== "ALL" && p.statType !== stat) return false;
    if (matchId !== "ALL" && p.match.id !== matchId) return false;
    if (!showLocked && !p.isOpen) return false;
    return true;
  });

  // Prefer open props first, then by line value
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
          ? "border-gold/50 bg-gold/15 text-gold-bright"
          : "border-border bg-transparent text-muted-foreground hover:border-gold/30 hover:text-parchment"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="animate-fade-rise space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-filigree bg-hearth px-5 py-6 md:px-7 md:py-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-leaf/15 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-serif text-base italic text-muted-foreground md:text-lg">
              Pipe-smoke &amp; parchment — where the club argues over kills, maps, and multipliers.
            </p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-[0.08em] text-gold-bright md:text-5xl">
              The Lists
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Valorant &amp; Call of Duty player props. Spend Crowns with friends — play-money only.
              Build two or more Marks, seal the slip, chase the multiplier.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="gap-2 border-gold/30"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        <div className="rune-rule mt-5" />
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip active={game === "ALL"} onClick={() => setGame("ALL")}>
            All Realms
          </Chip>
          <Chip active={game === "VALORANT"} onClick={() => setGame("VALORANT")}>
            Valorant
          </Chip>
          <Chip active={game === "COD"} onClick={() => setGame("COD")}>
            Call of Duty
          </Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={scope === "ALL"} onClick={() => setScope("ALL")}>
            All Scopes
          </Chip>
          <Chip active={scope === "SERIES"} onClick={() => setScope("SERIES")}>
            Series
          </Chip>
          <Chip active={scope === "MAP"} onClick={() => setScope("MAP")}>
            By Map
          </Chip>
          <Chip active={showLocked} onClick={() => setShowLocked((v) => !v)}>
            {showLocked ? "Showing Locked" : "Open Only"}
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

      {/* Map-gate explainer for live series */}
      {matches.some((m) => m.status === "LIVE") && (
        <div className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 font-serif text-sm text-parchment">
          <strong className="font-display text-ember">Live series rule:</strong>{" "}
          Later map props unlock only after the previous map ends — and only if
          the series still needs that map. Bo3 can end 2–0; Bo5 needs three map
          wins.
        </div>
      )}

      {isLoading && (
        <p className="font-serif italic text-muted-foreground">
          The clerk is drawing tonight&apos;s lists…
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not reach the club ledger. Locally run <code className="font-mono">pnpm dev:api</code> on
          :4000 — or wait for the hosted API to wake.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((p) => (
          <PropCard key={p.id} p={p} />
        ))}
      </div>

      {!isLoading && sorted.length === 0 && (
        <p className="py-16 text-center font-serif text-lg italic text-muted-foreground">
          The board is quiet under these filters. Widen the net, friend.
        </p>
      )}
    </div>
  );
}
