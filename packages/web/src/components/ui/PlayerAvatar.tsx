import React from "react";
import { getTeamColor } from "./jersey";

type Props = {
  name: string;
  team: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

/**
 * Club portrait: real / generated player image when available,
 * otherwise a gold-filigree crest with team color.
 */
export function PlayerAvatar({ name, team, imageUrl, size = 88, className = "" }: Props) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [imageUrl]);
  const color = getTeamColor(team);
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
  const showImg = imageUrl && !failed;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[rgba(201,168,76,0.4)] shadow-[inset_0_0_0_1px_rgba(232,201,106,0.08)] ${className}`}
      style={{ width: size, height: size, background: `linear-gradient(160deg, ${color}cc, #0c1f17)` }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <svg viewBox="0 0 64 64" className="h-[55%] w-[55%] opacity-90" aria-hidden>
            <path
              d="M12 18 L32 10 L52 18 L52 34 C52 48 32 56 32 56 C32 56 12 48 12 34 Z"
              fill="rgba(232,223,200,0.12)"
              stroke="#c9a84c"
              strokeWidth="2"
            />
            <text
              x="32"
              y="38"
              textAnchor="middle"
              fill="#e8c96a"
              fontSize="14"
              fontFamily="Cinzel, serif"
              fontWeight="700"
            >
              {initials}
            </text>
          </svg>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gold/80">
            {team.slice(0, 3)}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[rgba(201,168,76,0.2)]" />
    </div>
  );
}
