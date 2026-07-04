import { Router, Request, Response } from 'express';
import { all, one, run } from '../db/query';
import { generateSwissMatchups } from '../services/swiss';
import { generateDoubleElimBracket } from '../services/double-elim';
import { generateRoundRobinMatchups, computeGroupStandings } from '../services/round-robin';
import type { ApiResponse } from '../../../shared/types';

export const tournamentRoutes = Router();

// GET /api/tournaments
tournamentRoutes.get('/', (_req: Request, res: Response) => {
  const tournaments = all(
    `SELECT t.*,
      (SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id) as team_count
     FROM tournaments t ORDER BY t.created_at DESC`
  );
  res.json({ success: true, data: tournaments } as ApiResponse<any[]>);
});

// GET /api/tournaments/:id
tournamentRoutes.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const tournament = one('SELECT * FROM tournaments WHERE id = ?', [id]) as any;
  if (!tournament) return res.status(404).json({ success: false, error: '赛事不存在' });

  const teams = all(
    `SELECT tt.*, t.name as team_name,
      (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
     FROM tournament_teams tt
     JOIN teams t ON t.id = tt.team_id
     WHERE tt.tournament_id = ?
     ORDER BY tt.seed ASC, t.name ASC`,
    [id]
  );

  const matches = all('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, match_number', [id]);

  let standings = null;
  if (tournament.group_format === 'round_robin' || tournament.knockout_format === 'round_robin') {
    standings = computeGroupStandings(id);
  }

  // Player leaderboard from all teams in this tournament
  const leaderboard = all(
    `SELECT p.id as player_id, p.name as player_name, p.rank, p.rating, p.kd_ratio,
            p.avg_damage, p.headshot_pct, p.matches_played, p.wins
     FROM players p
     JOIN team_members tm ON tm.player_id = p.id
     JOIN tournament_teams tt ON tt.team_id = tm.team_id
     WHERE tt.tournament_id = ?
     ORDER BY p.rating DESC, p.kd_ratio DESC`,
    [id]
  );

  res.json({
    success: true,
    data: { ...tournament, teams, matches, standings, leaderboard },
  } as ApiResponse<any>);
});

// POST /api/tournaments
tournamentRoutes.post('/', (req: Request, res: Response) => {
  const { name, description, stage_type, group_format, knockout_format, team_size, max_participants } = req.body;
  if (!name || !stage_type) return res.status(400).json({ success: false, error: 'name, stage_type 必填' });

  const validFormats = ['swiss', 'double_elim', 'round_robin'];
  const validStages = ['group', 'knockout'];
  if (!validStages.includes(stage_type)) return res.status(400).json({ success: false, error: 'stage_type 无效' });

  const gFormat = validFormats.includes(group_format) ? group_format : 'round_robin';
  const kFormat = validFormats.includes(knockout_format) ? knockout_format : 'swiss';

  const result = run(
    `INSERT INTO tournaments (name, description, stage_type, group_format, knockout_format, team_size, max_participants)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description || '', stage_type, gFormat, kFormat, team_size || 5, max_participants || 16]
  );

  const tournament = one('SELECT * FROM tournaments WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ success: true, data: tournament });
});

// DELETE /api/tournaments/:id
tournamentRoutes.delete('/:id', (req: Request, res: Response) => {
  run('DELETE FROM tournaments WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

// POST /api/tournaments/:id/teams — add team to tournament
tournamentRoutes.post('/:id/teams', (req: Request, res: Response) => {
  const tournamentId = Number(req.params.id);
  const { team_id, seed, group_name } = req.body;

  const tournament = one('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
  if (!tournament) return res.status(404).json({ success: false, error: '赛事不存在' });

  const team = one('SELECT id, name FROM teams WHERE id = ?', [team_id]);
  if (!team) return res.status(404).json({ success: false, error: '战队不存在' });

  const exists = one('SELECT id FROM tournament_teams WHERE tournament_id = ? AND team_id = ?', [tournamentId, team_id]);
  if (exists) return res.status(409).json({ success: false, error: '该战队已在此赛事中' });

  run('INSERT INTO tournament_teams (tournament_id, team_id, seed, group_name) VALUES (?, ?, ?, ?)',
    [tournamentId, team_id, seed ?? null, group_name ?? null]);
  res.status(201).json({ success: true, data: team });
});

// DELETE /api/tournaments/:id/teams/:teamId
tournamentRoutes.delete('/:id/teams/:teamId', (req: Request, res: Response) => {
  run('DELETE FROM tournament_teams WHERE tournament_id = ? AND team_id = ?',
    [Number(req.params.id), Number(req.params.teamId)]);
  res.json({ success: true });
});

// POST /api/tournaments/:id/draw
tournamentRoutes.post('/:id/draw', (req: Request, res: Response) => {
  const tournamentId = Number(req.params.id);
  const tournament = one('SELECT * FROM tournaments WHERE id = ?', [tournamentId]) as any;
  if (!tournament) return res.status(404).json({ success: false, error: '赛事不存在' });

  const teams = all(
    `SELECT tt.team_id as id, t.name FROM tournament_teams tt
     JOIN teams t ON t.id = tt.team_id WHERE tt.tournament_id = ? ORDER BY tt.seed ASC`,
    [tournamentId]
  ) as { id: number; name: string }[];

  if (teams.length < 2) return res.status(400).json({ success: false, error: '至少需要 2 支战队才能抽签' });

  run('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
  run("UPDATE tournaments SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?", [tournamentId]);

  const activeFormat = tournament.stage_type === 'group' ? tournament.group_format : tournament.knockout_format;
  const teamIds = teams.map(t => t.id);

  switch (activeFormat) {
    case 'swiss': {
      const pairings = generateSwissMatchups(tournamentId, 1);
      for (let i = 0; i < pairings.length; i++) {
        const [aId, bId] = pairings[i];
        const aName = teams.find(t => t.id === aId)?.name || 'TBD';
        const bName = bId === -1 ? 'BYE' : (teams.find(t => t.id === bId)?.name || 'TBD');
        run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, status)
             VALUES (?, 1, ?, ?, ?, ?, ?, 'pending')`,
          [tournamentId, i + 1, aId, bId === -1 ? null : bId, aName, bName]);
      }
      break;
    }
    case 'double_elim': {
      const bracket = generateDoubleElimBracket(teamIds);
      for (const slot of bracket) {
        const r = slot.id === 'GF' ? 99 : slot.round;
        const aName = slot.team_a_id ? (teams.find(t => t.id === slot.team_a_id)?.name || 'TBD') : (slot.team_a_name || 'TBD');
        const bName = slot.team_b_id ? (teams.find(t => t.id === slot.team_b_id)?.name || 'TBD') : (slot.team_b_name || 'TBD');
        run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, bracket_position, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [tournamentId, r, slot.match_number, slot.team_a_id, slot.team_b_id, aName, bName, slot.id]);
      }
      break;
    }
    case 'round_robin': {
      const schedule = generateRoundRobinMatchups(teamIds);
      for (const rd of schedule) {
        for (let i = 0; i < rd.matchups.length; i++) {
          const [aId, bId] = rd.matchups[i];
          const aName = teams.find(t => t.id === aId)?.name || 'TBD';
          const bName = teams.find(t => t.id === bId)?.name || 'TBD';
          run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [tournamentId, rd.round, i + 1, aId, bId, aName, bName]);
        }
      }
      break;
    }
  }

  const inserted = all('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, match_number', [tournamentId]);
  res.json({ success: true, data: inserted });
});

// PUT /api/tournaments/:id/matches/:matchId
tournamentRoutes.put('/:id/matches/:matchId', (req: Request, res: Response) => {
  const tournamentId = Number(req.params.id);
  const matchId = Number(req.params.matchId);
  const { team_a_score, team_b_score } = req.body;

  const match = one('SELECT * FROM matches WHERE id = ? AND tournament_id = ?', [matchId, tournamentId]) as any;
  if (!match) return res.status(404).json({ success: false, error: '对阵不存在' });

  const winnerTeamId = team_a_score > team_b_score ? match.team_a_id : match.team_b_id;
  run(`UPDATE matches SET team_a_score = ?, team_b_score = ?, winner_team_id = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?`,
    [team_a_score, team_b_score, winnerTeamId, matchId]);

  const tournament = one('SELECT * FROM tournaments WHERE id = ?', [tournamentId]) as any;
  const activeFormat = tournament.stage_type === 'group' ? tournament.group_format : tournament.knockout_format;
  if (activeFormat === 'swiss') autoSwissNextRound(tournamentId, match.round);
  if (activeFormat === 'double_elim') advanceDoubleElim(tournamentId, match);

  res.json({ success: true, data: one('SELECT * FROM matches WHERE id = ?', [matchId]) });
});

// Helper: Swiss next round auto-generate
function autoSwissNextRound(tournamentId: number, currentRound: number): void {
  const pending = one("SELECT COUNT(*) as c FROM matches WHERE tournament_id = ? AND round = ? AND status != 'completed'",
    [tournamentId, currentRound]) as any;
  if (pending.c > 0) return;

  const teamCount = one('SELECT COUNT(*) as c FROM tournament_teams WHERE tournament_id = ?', [tournamentId]) as any;
  const maxRounds = Math.ceil(Math.log2(teamCount.c)) + 1;
  if (currentRound >= maxRounds) {
    run("UPDATE tournaments SET status = 'completed', updated_at = datetime('now') WHERE id = ?", [tournamentId]);
    return;
  }

  const pairings = generateSwissMatchups(tournamentId, currentRound + 1);
  if (pairings.length === 0) {
    run("UPDATE tournaments SET status = 'completed', updated_at = datetime('now') WHERE id = ?", [tournamentId]);
    return;
  }

  const teams = all('SELECT tt.team_id as id, t.name FROM tournament_teams tt JOIN teams t ON t.id = tt.team_id WHERE tt.tournament_id = ?', [tournamentId]) as any[];
  for (let i = 0; i < pairings.length; i++) {
    const [aId, bId] = pairings[i];
    const aName = teams.find((t: any) => t.id === aId)?.name || 'TBD';
    const bName = bId === -1 ? 'BYE' : (teams.find((t: any) => t.id === bId)?.name || 'TBD');
    run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [tournamentId, currentRound + 1, i + 1, aId, bId === -1 ? null : bId, aName, bName]);
  }
}

// Helper: double elim advancement
function advanceDoubleElim(tournamentId: number, match: any): void {
  if (!match.bracket_position) return;
  const teamIds = all('SELECT team_id as id FROM tournament_teams WHERE tournament_id = ?', [tournamentId]).map((t: any) => t.id);
  const bracket = generateDoubleElimBracket(teamIds);
  const slot = bracket.find((s) => s.id === match.bracket_position);
  if (!slot) return;

  const winnerId = match.winner_team_id;
  const loserId = match.team_a_id === winnerId ? match.team_b_id : match.team_a_id;

  if (slot.winner_to && winnerId) {
    const nm = one('SELECT * FROM matches WHERE tournament_id = ? AND bracket_position = ?', [tournamentId, slot.winner_to]) as any;
    if (nm) {
      if (!nm.team_a_id) run('UPDATE matches SET team_a_id = ?, team_a_name = (SELECT name FROM teams WHERE id = ?) WHERE id = ?', [winnerId, winnerId, nm.id]);
      else if (!nm.team_b_id) run('UPDATE matches SET team_b_id = ?, team_b_name = (SELECT name FROM teams WHERE id = ?) WHERE id = ?', [winnerId, winnerId, nm.id]);
    }
  }
  if (slot.loser_to && loserId && slot.bracket === 'W') {
    const nm = one('SELECT * FROM matches WHERE tournament_id = ? AND bracket_position = ?', [tournamentId, slot.loser_to]) as any;
    if (nm) {
      if (!nm.team_a_id) run('UPDATE matches SET team_a_id = ?, team_a_name = (SELECT name FROM teams WHERE id = ?) WHERE id = ?', [loserId, loserId, nm.id]);
      else if (!nm.team_b_id) run('UPDATE matches SET team_b_id = ?, team_b_name = (SELECT name FROM teams WHERE id = ?) WHERE id = ?', [loserId, loserId, nm.id]);
    }
  }
}
