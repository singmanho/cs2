// ============================================================
// CS2 Tourney — Shared Types (server & client)
// ============================================================

// --- Enums ---

export type TournamentFormat = 'swiss' | 'double_elim' | 'round_robin';
export type StageType = 'group' | 'knockout';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// 完美世界对战平台天梯段位体系 (按 MMR 从低到高)
export const CS2_RANKS = [
  '未定级',
  'D',
  'C', 'C+', '金C+',
  'B', 'B+', '金B+',
  'A', 'A+', '金A+',
  'S ★0~9', 'S ★10~24', 'S ★25~49', 'S ★≥50',
] as const;

export type CS2Rank = typeof CS2_RANKS[number];

// --- Player ---

export interface Player {
  id: number;
  name: string;
  rank: CS2Rank;
  avatar_url: string | null;
  rating: number;
  kd_ratio: number;
  avg_damage: number;
  headshot_pct: number;
  matches_played: number;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
}

// --- Team ---

export interface Team {
  id: number;
  name: string;
  logo_url: string | null;
  created_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: number;
  team_id: number;
  player_id: number;
  player?: Player;
}

// --- Tournament (team-based) ---

export interface Tournament {
  id: number;
  name: string;
  description: string;
  stage_type: StageType;
  group_format: TournamentFormat;
  knockout_format: TournamentFormat;
  team_size: number;
  max_participants: number;
  status: 'upcoming' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface TournamentTeam {
  id: number;
  tournament_id: number;
  team_id: number;
  seed: number | null;
  group_name: string | null;
  team?: Team;
}

// --- Match ---

export interface Match {
  id: number;
  tournament_id: number;
  round: number;
  match_number: number;
  team_a_id: number | null;
  team_b_id: number | null;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_team_id: number | null;
  status: MatchStatus;
  bracket_position: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
}

// --- Group Standing ---

export interface GroupStanding {
  team_id: number;
  team_name: string;
  group_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
}

// --- Player Leaderboard (per tournament) ---

export interface PlayerLeaderboardEntry {
  player_id: number;
  player_name: string;
  rank: string;
  rating: number;
  kd_ratio: number;
  avg_damage: number;
  headshot_pct: number;
  matches_played: number;
  wins: number;
}

// --- API DTOs ---

export interface CreatePlayerDTO {
  name: string;
  rank: CS2Rank;
  rating?: number;
  kd_ratio?: number;
  avg_damage?: number;
  headshot_pct?: number;
  matches_played?: number;
  wins?: number;
  losses?: number;
}

export interface CreateTeamDTO {
  name: string;
  player_ids?: number[];
}

export interface AddTeamMemberDTO {
  player_id: number;
}

export interface CreateTournamentDTO {
  name: string;
  description?: string;
  stage_type: StageType;
  group_format: string;
  knockout_format: string;
  team_size?: number;
  max_participants?: number;
}

export interface AddTeamToTournamentDTO {
  team_id: number;
  seed?: number;
  group_name?: string;
}

export interface UpdateMatchDTO {
  team_a_score: number;
  team_b_score: number;
}

export interface TournamentResponse extends Tournament {
  teams: TournamentTeam[];
  matches: Match[];
  standings?: GroupStanding[];
  leaderboard?: PlayerLeaderboardEntry[];
}

// --- Bracket ---

export interface BracketNode {
  id: string;
  round: number;
  match_number: number;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_to: string | null;
  loser_to: string | null;
  status: MatchStatus;
}

// --- API Response ---

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
