// ============================================================
// Swiss System Engine — CS2 Major Swiss Rules
// ============================================================
// Rules (matching CS2 Major format):
// - 3 wins to advance, 3 losses to eliminated
// - Same-record pairing (teams with equal W-L face each other)
// - No rematches
// - Buchholz tiebreaker for seeding
// - Odd group: lowest-seeded team drops to nearest adjacent group
// - Round 1: seed-based pairing (1v16, 2v15, ...)
// - Rounds 2+: pair by record, maximum matching within groups
// - BYE auto-completed as a win for the team

import { all, one } from '../db/query';

export interface SwissParticipant {
  id: number;
  name: string;
  wins: number;
  losses: number;
  buchholz: number;
  seed: number;
}

const WINS_TO_ADVANCE = 3;
const LOSSES_TO_ELIMINATE = 3;

/**
 * Generate matchups for the given round number (1-indexed).
 * Returns [teamA_id, teamB_id] pairs. teamB_id = -1 means BYE.
 */
export function generateSwissMatchups(tournamentId: number, nextRound: number): [number, number][] {
  const records = computeSwissRecords(tournamentId);
  if (records.length === 0) return [];

  // Round 1: seed-based pairing (highest seed vs lowest seed, etc.)
  if (nextRound === 1) {
    records.sort((a, b) => a.seed - b.seed);
    return pairBySeed(records);
  }

  // Filter out resolved teams (already advanced or eliminated)
  const active = records.filter(r => r.wins < WINS_TO_ADVANCE && r.losses < LOSSES_TO_ELIMINATE);
  if (active.length === 0) return [];

  // Build rematch set from all previously played matches
  const previousMatches = all(
    'SELECT team_a_id, team_b_id FROM matches WHERE tournament_id = ? AND team_a_id IS NOT NULL AND team_b_id IS NOT NULL',
    [tournamentId]
  ) as { team_a_id: number; team_b_id: number }[];

  const rematchSet = new Set<string>();
  for (const m of previousMatches) {
    rematchSet.add(`${Math.min(m.team_a_id, m.team_b_id)}-${Math.max(m.team_a_id, m.team_b_id)}`);
  }

  // Group active teams by wins (same record = same group)
  const groups = new Map<number, SwissParticipant[]>();
  for (const r of active) {
    const g = groups.get(r.wins) || [];
    g.push(r);
    groups.set(r.wins, g);
  }

  const paired = new Set<number>();
  const pairings: [number, number][] = [];

  // Process groups from highest wins to lowest.
  // When a group has odd count, one team drops to the next adjacent group.
  let droppedTeam: SwissParticipant | null = null;

  const sortedWins = [...groups.keys()].sort((a, b) => b - a);

  for (let gi = 0; gi < sortedWins.length; gi++) {
    const wins = sortedWins[gi];
    const group = groups.get(wins)!;

    // Combine with any dropped team from the previous (higher) group
    const candidates = [...group];
    if (droppedTeam) {
      candidates.push(droppedTeam);
      droppedTeam = null;
    }

    // Sort by buchholz desc, then seed asc for consistent ordering
    candidates.sort((a, b) => b.buchholz - a.buchholz || a.seed - b.seed);

    // Find maximum matching within this group
    const { matches, unmatched } = findMaxMatching(candidates, rematchSet);
    for (const [a, b] of matches) {
      pairings.push([a, b]);
      paired.add(a);
      paired.add(b);
    }

    // Handle unmatched teams
    if (unmatched.length === 1) {
      droppedTeam = unmatched[0];
    } else if (unmatched.length >= 2) {
      // Edge case: multiple unmatched. Last one gets BYE.
      const byeTeam = unmatched[unmatched.length - 1];
      pairings.push([byeTeam.id, -1]);
      paired.add(byeTeam.id);
    }
  }

  // Handle last dropped team (give BYE)
  if (droppedTeam && !paired.has(droppedTeam.id)) {
    pairings.push([droppedTeam.id, -1]);
    paired.add(droppedTeam.id);
  }

  return pairings;
}

/**
 * Find maximum matching using recursive backtracking.
 * For small groups (<=8 teams), this is fast and guarantees optimal pairings.
 */
function findMaxMatching(
  candidates: SwissParticipant[],
  rematchSet: Set<string>,
): { matches: [number, number][]; unmatched: SwissParticipant[] } {
  const n = candidates.length;
  if (n === 0) return { matches: [], unmatched: [] };
  if (n === 1) return { matches: [], unmatched: [candidates[0]] };

  let bestMatches: [number, number][] = [];
  let bestCount = 0;

  function backtrack(used: boolean[], cur: [number, number][]) {
    // Find first unused team
    let first = -1;
    for (let k = 0; k < n; k++) {
      if (!used[k]) { first = k; break; }
    }
    if (first === -1) {
      if (cur.length > bestCount) {
        bestCount = cur.length;
        bestMatches = [...cur];
      }
      return;
    }

    // Try pairing 'first' with each unused team j > first
    for (let j = first + 1; j < n; j++) {
      if (used[j]) continue;

      const key = `${Math.min(candidates[first].id, candidates[j].id)}-${Math.max(candidates[first].id, candidates[j].id)}`;
      if (rematchSet.has(key)) continue;

      used[first] = used[j] = true;
      cur.push([candidates[first].id, candidates[j].id]);

      backtrack(used, cur);

      cur.pop();
      used[first] = used[j] = false;
    }

    // Also try leaving 'first' unpaired
    used[first] = true;
    backtrack(used, cur);
    used[first] = false;
  }

  backtrack(new Array<boolean>(n).fill(false), []);

  // Determine unmatched teams
  const pairedIds = new Set<number>();
  for (const [a, b] of bestMatches) {
    pairedIds.add(a);
    pairedIds.add(b);
  }
  const unmatched = candidates.filter(c => !pairedIds.has(c.id));

  return { matches: bestMatches, unmatched };
}

/**
 * Round 1 pairing: seed-based (1v16, 2v15, ...)
 */
function pairBySeed(records: SwissParticipant[]): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < records.length - 1; i += 2) {
    result.push([records[i].id, records[i + 1].id]);
  }
  if (records.length % 2 !== 0) {
    result.push([records[records.length - 1].id, -1]); // BYE
  }
  return result;
}

/**
 * Check if the Swiss tournament is complete (all teams resolved).
 */
export function isSwissComplete(tournamentId: number): boolean {
  const records = computeSwissRecords(tournamentId);
  if (records.length === 0) return true;
  return records.every(r => r.wins >= WINS_TO_ADVANCE || r.losses >= LOSSES_TO_ELIMINATE);
}

/**
 * Compute Swiss records for all teams in a tournament.
 */
function computeSwissRecords(tournamentId: number): SwissParticipant[] {
  const participants = all(
    `SELECT tt.team_id as id, t.name, tt.seed
     FROM tournament_teams tt JOIN teams t ON t.id = tt.team_id
     WHERE tt.tournament_id = ?
     ORDER BY tt.seed ASC, t.name ASC`,
    [tournamentId]
  ) as { id: number; name: string; seed: number | null }[];

  const records: SwissParticipant[] = participants.map((p, idx) => {
    const winRow = one(
      "SELECT COUNT(*) as cnt FROM matches WHERE tournament_id = ? AND winner_team_id = ? AND status = 'completed'",
      [tournamentId, p.id]
    ) as any;

    const lossRow = one(
      `SELECT COUNT(*) as cnt FROM matches WHERE tournament_id = ? AND status = 'completed'
       AND winner_team_id IS NOT NULL AND winner_team_id != ?
       AND (team_a_id = ? OR team_b_id = ?)`,
      [tournamentId, p.id, p.id, p.id]
    ) as any;

    const wins = winRow?.cnt || 0;
    const losses = lossRow?.cnt || 0;
    const buchholz = computeBuchholz(tournamentId, p.id);

    return {
      id: p.id,
      name: p.name,
      wins,
      losses,
      buchholz,
      seed: p.seed ?? (idx + 1),
    };
  });

  return records;
}

/**
 * Buchholz score: sum of all opponents' win counts.
 */
function computeBuchholz(tournamentId: number, teamId: number): number {
  const opponents = all(
    `SELECT DISTINCT
       CASE WHEN team_a_id = ? THEN team_b_id ELSE team_a_id END as opp_id
     FROM matches
     WHERE tournament_id = ? AND status = 'completed'
       AND (team_a_id = ? OR team_b_id = ?)
       AND winner_team_id IS NOT NULL
       AND team_a_id IS NOT NULL AND team_b_id IS NOT NULL`,
    [teamId, tournamentId, teamId, teamId]
  ) as { opp_id: number }[];

  let total = 0;
  for (const opp of opponents) {
    if (!opp.opp_id) continue;
    const wins = one(
      "SELECT COUNT(*) as cnt FROM matches WHERE tournament_id = ? AND winner_team_id = ? AND status = 'completed'",
      [tournamentId, opp.opp_id]
    ) as any;
    total += wins?.cnt || 0;
  }
  return total;
}
