// ============================================================
// Double Elimination Engine
// ============================================================
// Standard double-elimination bracket:
// - All participants start in Winners Bracket (WB)
// - Lose once → drop to Losers Bracket (LB)
// - Lose twice → eliminated
// - Grand Final: WB winner vs LB winner

import { all, one } from '../db/query';

export interface BracketSlot {
  id: string;              // "W1-1", "L2-3" etc
  round: number;
  match_number: number;
  bracket: 'W' | 'L';      // Winners or Losers
  team_a_id: number | null;
  team_b_id: number | null;
  team_a_name: string;
  team_b_name: string;
  winner_to: string | null;
  loser_to: string | null;
}

/**
 * Generate initial double-elimination bracket from a list of participant IDs.
 * Pads to next power of 2 with byes if needed.
 */
export function generateDoubleElimBracket(
  participantIds: number[]
): BracketSlot[] {
  const n = participantIds.length;
  const bracketSize = nextPowerOfTwo(n);
  const slots: BracketSlot[] = [];

  // Shuffle participants for fair seeding
  const shuffled = [...participantIds].sort(() => Math.random() - 0.5);

  // ---- Winners Bracket Round 1 ----
  const w1Matches = bracketSize / 2;
  for (let i = 0; i < w1Matches; i++) {
    const a = shuffled[i * 2] ?? null;
    const b = shuffled[i * 2 + 1] ?? null;

    slots.push({
      id: `W1-${i + 1}`,
      round: 1,
      match_number: i + 1,
      bracket: 'W',
      team_a_id: a,
      team_b_id: b,
      team_a_name: '',
      team_b_name: '',
      winner_to: i < w1Matches / 2 ? `W2-${Math.floor(i / 2) + 1}` : null,
      loser_to: `L1-${i + 1}`,
    });
  }

  // ---- Winners Bracket subsequent rounds ----
  let prevWMatches = w1Matches;
  let wRound = 2;
  while (prevWMatches > 1) {
    const matches = prevWMatches / 2;
    for (let i = 0; i < matches; i++) {
      slots.push({
        id: `W${wRound}-${i + 1}`,
        round: wRound,
        match_number: i + 1,
        bracket: 'W',
        team_a_id: null,
        team_b_id: null,
        team_a_name: '',
        team_b_name: '',
        winner_to: matches > 1 ? `W${wRound + 1}-${Math.floor(i / 2) + 1}` : 'GF',
        loser_to: `L${wRound * 2 - 2}-${Math.floor(i / 2) + 1}`,
      });
    }
    prevWMatches = matches;
    wRound++;
  }

  // ---- Losers Bracket ----
  const totalWBRounds = wRound - 1;

  // L1: losers from W1
  for (let i = 0; i < w1Matches; i++) {
    const lRound = 1;
    // Wait for W1 losers
    slots.push({
      id: `L${lRound}-${i + 1}`,
      round: 1,
      match_number: i + 1,
      bracket: 'L',
      team_a_id: null,
      team_b_id: null,
      team_a_name: '',
      team_b_name: '',
      winner_to: null, // determined by bracket progression
      loser_to: null,
    });
  }

  // Subsequent LB rounds
  let lRound = 2;
  let prevLMatches = w1Matches;
  while (prevLMatches > 1) {
    const matches = prevLMatches / 2;
    for (let i = 0; i < matches; i++) {
      slots.push({
        id: `L${lRound}-${i + 1}`,
        round: lRound,
        match_number: i + 1,
        bracket: 'L',
        team_a_id: null,
        team_b_id: null,
        team_a_name: '',
        team_b_name: '',
        winner_to: matches > 1 ? `L${lRound + 1}-${Math.floor(i / 2) + 1}` : 'GF',
        loser_to: null,
      });
    }
    prevLMatches = matches;
    lRound++;
  }

  // ---- Grand Final ----
  slots.push({
    id: 'GF',
    round: 99,
    match_number: 1,
    bracket: 'W',
    team_a_id: null,
    team_b_id: null,
    team_a_name: 'WB Winner',
    team_b_name: 'LB Winner',
    winner_to: null,
    loser_to: null,
  });

  return slots;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Get full bracket tree for a tournament.
 * Returns both the bracket structure and current match states.
 */
export function getDoubleElimBracket(tournamentId: number): any[] {
  const bracket = all(
    `SELECT * FROM matches WHERE tournament_id = ? ORDER BY bracket_position, round, match_number`,
    [tournamentId]
  );

  return bracket;
}

// ============================================================
// Single Elimination Engine
// ============================================================
export function generateSingleElimBracket(participantIds: number[]): BracketSlot[] {
  const n = participantIds.length;
  const bracketSize = nextPowerOfTwo(n);
  const slots: BracketSlot[] = [];
  const shuffled = [...participantIds].sort(() => Math.random() - 0.5);

  // Round 1
  const r1Matches = bracketSize / 2;
  for (let i = 0; i < r1Matches; i++) {
    const a = shuffled[i * 2] ?? null;
    const b = shuffled[i * 2 + 1] ?? null;
    slots.push({
      id: `R1-${i + 1}`,
      round: 1, match_number: i + 1, bracket: 'W',
      team_a_id: a, team_b_id: b, team_a_name: '', team_b_name: '',
      winner_to: r1Matches > 1 ? `R2-${Math.floor(i / 2) + 1}` : null, loser_to: null,
    });
  }

  // Subsequent rounds
  let prevMatches = r1Matches;
  let round = 2;
  while (prevMatches > 1) {
    const matches = prevMatches / 2;
    for (let i = 0; i < matches; i++) {
      slots.push({
        id: `R${round}-${i + 1}`,
        round, match_number: i + 1, bracket: 'W',
        team_a_id: null, team_b_id: null, team_a_name: '', team_b_name: '',
        winner_to: matches > 1 ? `R${round + 1}-${Math.floor(i / 2) + 1}` : null, loser_to: null,
      });
    }
    prevMatches = matches;
    round++;
  }

  return slots;
}
