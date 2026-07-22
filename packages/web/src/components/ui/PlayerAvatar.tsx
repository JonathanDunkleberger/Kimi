import React from "react";
import { getTeamColor } from "./jersey";

type Props = {
  name: string;
  team: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  rounded?: "full" | "xl";
};

/**
 * Player portrait — real photo when available, team-color crest fallback.
 */
export function PlayerAvatar({
  name,
  team,
  imageUrl,
  size = 88,
  className = "",
  rounded = "full",
}: Props) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [imageUrl]);
  const color = getTeamColor(team);
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
  const showImg = Boolean(imageUrl) && !failed;
  const radius = rounded === "full" ? "9999px" : "14px";

  return (
    <div
      className={`relative overflow-hidden border border-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(160deg, ${color}bb, #1f2026)`,
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt={name}
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span
            className="font-display font-extrabold text-white/90"
            style={{ fontSize: Math.max(12, size * 0.28) }}
          >
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
