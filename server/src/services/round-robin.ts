// ============================================================
// Round-Robin Engine
// ============================================================
import { all } from '../db/query';

/**
 * Generate round-robin matchups using the circle method.
 */
export function generateRoundRobinMatchups(participantIds: number[]): { round: number; matchups: [number, number][] }[] {
  const n = participantIds.length;
  if (n < 2) return [];

  const ids = [...participantIds];
  const isOdd = n % 2 !== 0;
  if (isOdd) ids.push(-1);

  const totalRounds = ids.length - 1;
  const schedule: { round: number; matchups: [number, number][] }[] = [];
  const rotating = ids.slice(1);

  for (let round = 1; round <= totalRounds; round++) {
    const matchups: [number, number][] = [];
    const fixed = ids[0];
    if (fixed !== -1 && rotating[rotating.length - 1] !== -1) {
      matchups.push([fixed, rotating[rotating.length - 1]]);
    }
    for (let i = 0; i < Math.floor(rotating.length / 2) - (isOdd ? 0 : 0); i++) {
      const a = rotating[i], b = rotating[rotating.length - 2 - i];
      if (a !== -1 && b !== -1) matchups.push([a, b]);
    }
    if (matchups.length > 0) schedule.push({ round, matchups });
    rotating.unshift(rotating.pop()!);
  }
  return schedule;
}

/**
 * Compute group standings for a round-robin tournament.
 */
export function computeGroupStandings(tournamentId: number): any[] {
  const players = all(
    'SELECT tp.player_id as team_id, p.name as team_name, tp.group_name FROM tournament_players tp JOIN players p ON p.id = tp.player_id WHERE tp.tournament_id = ?',
    [tournamentId]
  ) as any[];

  const matches = all(
    "SELECT team_a_id, team_b_id, winner_team_id FROM matches WHERE tournament_id = ? AND status = 'completed'",
    [tournamentId]
  ) as any[];

  const map = new Map<number, any>();
  for (const p of players) {
    map.set(p.team_id, {
      team_id: p.team_id,
      team_name: p.team_name,
      group_name: p.group_name,
      wins: 0, losses: 0, draws: 0, points: 0, round_diff: 0, matches_played: 0,
    });
  }

  for (const m of matches) {
    if (!m.winner_team_id) continue;
    const a = map.get(m.team_a_id), b = map.get(m.team_b_id);
    if (!a || !b) continue;
    a.matches_played++; b.matches_played++;
    if (m.winner_team_id === m.team_a_id) { a.wins++; a.points += 3; b.losses++; }
    else if (m.winner_team_id === m.team_b_id) { b.wins++; b.points += 3; a.losses++; }
    else { a.draws++; b.draws++; a.points++; b.points++; }
  }

  return [...map.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
}
