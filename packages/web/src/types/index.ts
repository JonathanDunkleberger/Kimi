// ─── Kimi Type Definitions ───────────────────────────────────────────────────

export type Game = 'valorant' | 'cod';

export interface Team {
  id: string;
  name: string;
  abbrev: string | null;
  logo_url: string | null;
  color: string;
  region: string | null;
  game: Game;
}

export interface Player {
  id: string;
  name: string;
  ign: string | null;
  team_id: string | null;
  role: string | null;
  photo_url: string | null;
  team?: Team;
}

export interface Match {
  id: string;
  event_id: string | null;
  team_a_id: string;
  team_b_id: string;
  start_time: string;
  status: string;
  map: string | null;
  vlr_match_id: string | null;
  game: Game;
  game_mode: string | null;
  series_format: string | null;
  event?: { id: string; name: string };
  team_a?: Team;
  team_b?: Team;
}

export interface PropType {
  id: string;
  name: string;
}

export interface PropLine {
  id: string;
  match_id: string;
  player_id: string;
  prop_type_id: string;
  line_value: number;
  ml_confidence: number | null;
  ml_direction: 'over' | 'under' | null;
  status: string;
  actual_result: number | null;
  player?: Player;
  match?: Match;
  prop_type?: PropType;
}

export interface SlipPick {
  propLine: PropLine;
  direction: 'over' | 'under';
}

export interface Entry {
  id: number;
  user_id: string;
  wager: number;
  multiplier: number;
  potential_payout: number;
  actual_payout: number;
  status: 'pending' | 'won' | 'lost' | 'void' | 'partial';
  created_at: string;
  entry_legs?: EntryLeg[];
}

export interface EntryLeg {
  id: number;
  entry_id: number;
  prop_line_id: string;
  pick: 'over' | 'under';
  result: 'won' | 'lost' | 'push' | 'void' | null;
  prop_line?: PropLine;
}

export interface LeaderboardUser {
  id: string;
  username: string;
  avatar_emoji: string;
  balance: number;
  wins: number;
  losses: number;
  current_streak: number;
  profit: number;
  win_rate: number;
  total_wagered: number;
  total_won: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_emoji: string;
  balance: number;
  wins: number;
  losses: number;
  current_streak: number;
  total_wagered: number;
  total_won: number;
}
