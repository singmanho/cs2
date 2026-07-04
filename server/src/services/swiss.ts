// ============================================================
// Swiss System Engine
// ============================================================
// Standard Swiss rules:
// - Round 1: random pairing
// - Subsequent rounds: pair players with equal or closest records
// - No rematches within the same tournament
// - Byes awarded when odd number of participants

import { all, one } from '../db/query';

export interface SwissParticipant {
  id: number;
  name: string;
  wins: number;
  losses: number;
  points: number;
}

/**
 * Generate the next round of Swiss matchups.
 * @returns array of pairings [playerAId, playerBId], [-1] means bye
 */
export function generateSwissMatchups(tournamentId: number, nextRound: number): [number, number][] {
  const records = computeSwissRecords(tournamentId);
  if (records.length === 0) return [];

  // Round 1: random shuffle for initial pairing
  if (nextRound === 1) {
    const shuffled = [...records].sort(() => Math.random() - 0.5);
    return pairBySeed(shuffled);
  }

  // Subsequent rounds: pair by points (equal records play each other)
  records.sort((a, b) => b.points - a.points || a.id - b.id);

  const previousMatches = all(
    'SELECT team_a_id, team_b_id FROM matches WHERE tournament_id = ?',
    [tournamentId]
  ) as { team_a_id: number; team_b_id: number }[];

  const matchupSet = new Set<string>();
  for (const m of previousMatches) {
    if (m.team_a_id && m.team_b_id) {
      matchupSet.add([m.team_a_id, m.team_b_id].sort().join('-'));
    }
  }

  const paired = new Set<number>();
  const pairings: [number, number][] = [];

  // Group by points
  const groups = new Map<number, SwissParticipant[]>();
  for (const p of records) {
    const pts = p.points;
    if (!groups.has(pts)) groups.set(pts, []);
    groups.get(pts)!.push(p);
  }

  for (const [, group] of [...groups.entries()].sort((a, b) => b[0] - a[0])) {
    const unpaired = group.filter(p => !paired.has(p.id));
    if (unpaired.length === 0) continue;
    const groupPairings = pairWithinGroup(unpaired, matchupSet, paired);
    for (const [a, b] of groupPairings) pairings.push([a, b]);
  }

  // Cross-group pairing for remaining
  const remaining = records.filter(p => !paired.has(p.id));
  for (let i = 0; i < remaining.length - 1; i += 2) {
    if (!paired.has(remaining[i].id) && !paired.has(remaining[i + 1].id)) {
      const a = remaining[i].id, b = remaining[i + 1].id;
      const key = [a, b].sort().join('-');
      if (!matchupSet.has(key)) {
        pairings.push([a, b]);
        paired.add(a);
        paired.add(b);
      }
    }
  }

  // Bye for odd player
  const stillUnpaired = records.filter(p => !paired.has(p.id));
  if (stillUnpaired.length === 1) {
    pairings.push([stillUnpaired[0].id, -1]);
  }

  return pairings;
}

/** Round 1: simple adjacent pairing after shuffle */
function pairBySeed(records: SwissParticipant[]): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < records.length - 1; i += 2) {
    result.push([records[i].id, records[i + 1].id]);
  }
  if (records.length % 2 !== 0) {
    result.push([records[records.length - 1].id, -1]);
  }
  return result;
}

function computeSwissRecords(tournamentId: number): SwissParticipant[] {
  const participants = all(
    'SELECT tp.player_id as id, p.name FROM tournament_players tp JOIN players p ON p.id = tp.player_id WHERE tp.tournament_id = ?',
    [tournamentId]
  ) as { id: number; name: string }[];

  return participants.map(p => {
    const wins = one(
      "SELECT COUNT(*) as cnt FROM matches WHERE tournament_id = ? AND winner_team_id = ? AND status = 'completed'",
      [tournamentId, p.id]
    ) as any;

    const losses = one(
      `SELECT COUNT(*) as cnt FROM matches WHERE tournament_id = ? AND status = 'completed'
       AND winner_team_id IS NOT NULL AND winner_team_id != ?
       AND (team_a_id = ? OR team_b_id = ?)`,
      [tournamentId, p.id, p.id, p.id]
    ) as any;

    return {
      id: p.id,
      name: p.name,
      wins: wins?.cnt || 0,
      losses: losses?.cnt || 0,
      points: (wins?.cnt || 0) * 3,
    };
  });
}

function pairWithinGroup(
  group: SwissParticipant[],
  matchupSet: Set<string>,
  paired: Set<number>
): [number, number][] {
  const pairings: [number, number][] = [];
  const available = group.filter(p => !paired.has(p.id));
  const used = new Set<number>();

  for (let i = 0; i < available.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < available.length; j++) {
      if (used.has(j)) continue;
      const a = available[i].id, b = available[j].id;
      const key = [a, b].sort().join('-');
      if (!matchupSet.has(key)) {
        pairings.push([a, b]);
        paired.add(a);
        paired.add(b);
        used.add(i);
        used.add(j);
        matchupSet.add(key);
        break;
      }
    }
  }
  return pairings;
}
