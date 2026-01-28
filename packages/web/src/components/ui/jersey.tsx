import React from 'react';

const TEAM_COLORS: Record<string, string> = {
  // EMEA
  'FNC': '#FF5900', 'FNATIC': '#FF5900',
  'KC': '#174b97', 'KARMINE CORP': '#174b97', 'KARMINE': '#174b97',
  'M8': '#ff81c1', 'GENTLE MATES': '#ff81c1',
  'TL': '#0A1E31', 'TEAM LIQUID': '#0A1E31', 'LIQUID': '#0A1E31',
  'VIT': '#F0E51B', 'VITALITY': '#F0E51B', 'TEAM VITALITY': '#F0E51B',
  'TH': '#2C2B2B', 'TEAM HERETICS': '#2C2B2B', 'HERETICS': '#2C2B2B',
  'NAVI': '#FFEE00', 'NATUS VINCERE': '#FFEE00',
  'BBL': '#9A9A9A', 'BBL ESPORTS': '#9A9A9A',
  'FUT': '#C3272D', 'FUT ESPORTS': '#C3272D',
  'KOI': '#5A1F5C',
  'GIANTS': '#E62432', 'GIANTS GAMING': '#E62432', 'GX': '#E62432',
  
  // Americas
  'SEN': '#CE2029', 'SENTINELS': '#CE2029',
  'NRG': '#111111', 
  'C9': '#00AEEF', 'CLOUD9': '#00AEEF',
  '100T': '#C00000', '100 THIEVES': '#C00000',
  'LOUD': '#15BB00',
  'LEV': '#3CAEA3', 'LEVIATAN': '#3CAEA3',
  'FUR': '#000000', 'FURIA': '#000000',
  'KRU': '#FF0090', 'KRU ESPORTS': '#FF0090',
  'MIBR': '#000000',
  'G2': '#EE2D23', 'G2 ESPORTS': '#EE2D23',
  'EG': '#0C2340', 'EVIL GENIUSES': '#0C2340',

  // Pacific
  'PRX': '#8000FF', 'PAPER REX': '#8000FF',
  'DRX': '#264379',
  'T1': '#EA0029',
  'ZETA': '#000000', 'ZETA DIVISION': '#000000',
  'GEN': '#AA8A00', 'GEN.G': '#AA8A00',
  'GE': '#243E94', 'GLOBAL ESPORTS': '#243E94',
  'RRQ': '#FDB913', 'REX REGUM QEON': '#FDB913',
  'TS': '#000000', 'TEAM SECRET': '#000000',
  'TLN': '#E4002B', 'TALON': '#E4002B', 'TALON ESPORTS': '#E4002B',
  'DFM': '#3E2B54', 'DETONATION': '#3E2B54', 'DETONATION FOCUSME': '#3E2B54',
  'BLD': '#F5F5F5', 'BLEED': '#F5F5F5', 'BLEED ESPORTS': '#F5F5F5',
};

// --- HEX Color Helper for Team Jerseys ---
export const getTeamColor = (team: string) => {
  if (!team) return '#333333';
  const upper = team.toUpperCase().trim();
  
  // 1. Check direct map
  if (TEAM_COLORS[upper]) return TEAM_COLORS[upper];
  
  // 2. Fallback hash
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash = upper.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export const JerseyPlaceholder = ({ team, className }: { team: string; className?: string }) => {
  const color = getTeamColor(team || 'FA');
  return (
    <div className={`relative flex items-center justify-center ${className || 'w-full h-full'}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-full w-auto drop-shadow-md"
        fill={color}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      >
        <path d="M16 2L20 4L22 8L18 10V22H6V10L2 8L4 4L8 2H16Z" />
        <path d="M9 2C9 4 15 4 15 2" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1 text-white/90 font-black text-[10px] sm:text-xs tracking-tighter drop-shadow-sm select-none bg-black/20 px-1 rounded-sm">
        {team?.slice(0, 4).toUpperCase()}
      </div>
    </div>
  );
};
