import { Router, Request, Response } from 'express';
import { all, one, run } from '../db/query';
import { generateSwissMatchups, isSwissComplete } from '../services/swiss';
import { generateDoubleElimBracket, generateSingleElimBracket } from '../services/double-elim';
import { generateRoundRobinMatchups, computeGroupStandings } from '../services/round-robin';
import type { ApiResponse } from '../../../shared/types';

export const tournamentRoutes = Router();

// GET /api/tournaments
tournamentRoutes.get('/', (_req: Request, res: Response) => {
  const ts = all(`SELECT t.*, (SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id) as team_count FROM tournaments t ORDER BY t.created_at DESC`);
  res.json({ success: true, data: ts } as ApiResponse<any[]>);
});

// GET /api/tournaments/:id
tournamentRoutes.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const t = one('SELECT * FROM tournaments WHERE id = ?', [id]) as any;
  if (!t) return res.status(404).json({ success: false, error: '赛事不存在' });

  const teams = all(
    `SELECT tt.*, t.name as team_name, (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
     FROM tournament_teams tt JOIN teams t ON t.id = tt.team_id WHERE tt.tournament_id = ? ORDER BY tt.seed ASC, t.name ASC`, [id]);

  const matches = all('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, match_number', [id]);

  let standings = null;
  if (t.group_format === 'round_robin' || t.knockout_format === 'round_robin') standings = computeGroupStandings(id);

  const leaderboard = all(
    `SELECT p.id as player_id, p.name as player_name, p.rank, p.rating, p.kd_ratio, p.avg_damage, p.headshot_pct, p.matches_played, p.wins
     FROM players p JOIN team_members tm ON tm.player_id = p.id JOIN tournament_teams tt ON tt.team_id = tm.team_id
     WHERE tt.tournament_id = ? ORDER BY p.rating DESC, p.kd_ratio DESC`, [id]);

  res.json({ success: true, data: { ...t, teams, matches, standings, leaderboard } } as ApiResponse<any>);
});

// POST /api/tournaments
tournamentRoutes.post('/', (req: Request, res: Response) => {
  const { name, description, stage_type, group_format, knockout_format, team_size, max_participants, default_bo } = req.body;
  if (!name || !stage_type) return res.status(400).json({ success: false, error: 'name, stage_type 必填' });

  const validFormats = ['swiss', 'double_elim', 'round_robin', 'single_elim'];
  if (!['group', 'knockout'].includes(stage_type)) return res.status(400).json({ success: false, error: 'stage_type 无效' });

  const gF = validFormats.includes(group_format) ? group_format : 'round_robin';
  const kF = validFormats.includes(knockout_format) ? knockout_format : 'swiss';
  const bo = [1, 3, 5].includes(default_bo) ? default_bo : 1;

  const r = run(`INSERT INTO tournaments (name, description, stage_type, group_format, knockout_format, team_size, max_participants, default_bo) VALUES (?,?,?,?,?,?,?,?)`,
    [name, description || '', stage_type, gF, kF, team_size || 5, max_participants || 16, bo]);
  res.status(201).json({ success: true, data: one('SELECT * FROM tournaments WHERE id = ?', [r.lastInsertRowid]) });
});

// DELETE
tournamentRoutes.delete('/:id', (req: Request, res: Response) => { run('DELETE FROM tournaments WHERE id = ?', [Number(req.params.id)]); res.json({ success: true }); });

// POST /api/tournaments/:id/start
tournamentRoutes.post('/:id/start', (req: Request, res: Response) => {
  const tid = Number(req.params.id);
  const t = one('SELECT * FROM tournaments WHERE id = ?', [tid]) as any;
  if (!t) return res.status(404).json({ success: false, error: '赛事不存在' });
  if (t.status === 'in_progress') return res.status(400).json({ success: false, error: '赛事已在进行中' });
  run("UPDATE tournaments SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?", [tid]);
  res.json({ success: true, data: one('SELECT * FROM tournaments WHERE id = ?', [tid]) });
});

// POST /api/tournaments/:id/end
tournamentRoutes.post('/:id/end', (req: Request, res: Response) => {
  const tid = Number(req.params.id);
  const t = one('SELECT * FROM tournaments WHERE id = ?', [tid]) as any;
  if (!t) return res.status(404).json({ success: false, error: '赛事不存在' });
  if (t.status === 'completed') return res.status(400).json({ success: false, error: '赛事已结束' });
  run("UPDATE tournaments SET status = 'completed', updated_at = datetime('now') WHERE id = ?", [tid]);
  res.json({ success: true, data: one('SELECT * FROM tournaments WHERE id = ?', [tid]) });
});

// POST /api/tournaments/:id/teams — add single team
tournamentRoutes.post('/:id/teams', (req: Request, res: Response) => {
  const tid = Number(req.params.id);
  const { team_id, seed, group_name } = req.body;
  if (!one('SELECT id FROM tournaments WHERE id = ?', [tid])) return res.status(404).json({ success: false, error: '赛事不存在' });
  if (!one('SELECT id, name FROM teams WHERE id = ?', [team_id])) return res.status(404).json({ success: false, error: '战队不存在' });
  if (one('SELECT id FROM tournament_teams WHERE tournament_id = ? AND team_id = ?', [tid, team_id]))
    return res.status(409).json({ success: false, error: '该战队已在此赛事中' });
  run('INSERT INTO tournament_teams (tournament_id, team_id, seed, group_name) VALUES (?,?,?,?)', [tid, team_id, seed ?? null, group_name ?? null]);
  res.status(201).json({ success: true });
});

// POST /api/tournaments/:id/teams/batch — batch add teams
tournamentRoutes.post('/:id/teams/batch', (req: Request, res: Response) => {
  const tid = Number(req.params.id);
  const { team_ids } = req.body;
  if (!Array.isArray(team_ids) || team_ids.length === 0)
    return res.status(400).json({ success: false, error: 'team_ids 必填' });
  if (!one('SELECT id FROM tournaments WHERE id = ?', [tid]))
    return res.status(404).json({ success: false, error: '赛事不存在' });
  let added = 0;
  for (const tId of team_ids) {
    if (!one('SELECT id FROM tournament_teams WHERE tournament_id = ? AND team_id = ?', [tid, tId])) {
      run('INSERT INTO tournament_teams (tournament_id, team_id) VALUES (?,?)', [tid, tId]);
      added++;
    }
  }
  res.json({ success: true, data: { added } });
});

// DELETE /api/tournaments/:id/teams/:teamId
tournamentRoutes.delete('/:id/teams/:teamId', (req: Request, res: Response) => {
  run('DELETE FROM tournament_teams WHERE tournament_id = ? AND team_id = ?', [Number(req.params.id), Number(req.params.teamId)]);
  res.json({ success: true });
});

// POST /api/tournaments/:id/draw
tournamentRoutes.post('/:id/draw', (req: Request, res: Response) => {
  const tid = Number(req.params.id);
  const t = one('SELECT * FROM tournaments WHERE id = ?', [tid]) as any;
  if (!t) return res.status(404).json({ success: false, error: '赛事不存在' });

  const teams = all(`SELECT tt.team_id as id, t.name FROM tournament_teams tt JOIN teams t ON t.id = tt.team_id WHERE tt.tournament_id = ? ORDER BY tt.seed ASC`, [tid]) as { id: number; name: string }[];
  if (teams.length < 2) return res.status(400).json({ success: false, error: '至少需要 2 支战队才能抽签' });

  const fmt = t.stage_type === 'group' ? t.group_format : t.knockout_format;
  if (fmt === 'swiss' && teams.length < 16) return res.status(400).json({ success: false, error: '瑞士轮至少需要 16 支战队' });

  run('DELETE FROM matches WHERE tournament_id = ?', [tid]);
  run("UPDATE tournaments SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?", [tid]);

  const ids = teams.map(x => x.id);
  const bo = t.default_bo || 1;

  switch (fmt) {
    case 'swiss': {
      const pairings = generateSwissMatchups(tid, 1);
      for (let i = 0; i < pairings.length; i++) {
        const [a, b] = pairings[i];
        const aN = teams.find(x => x.id === a)?.name || 'TBD';
        const bN = b === -1 ? 'BYE' : (teams.find(x => x.id === b)?.name || 'TBD');
        run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, bo, status) VALUES (?,1,?,?,?,?,?,?,'pending')`,
          [tid, i + 1, a, b === -1 ? null : b, aN, bN, bo]);
      }
      break;
    }
    case 'double_elim': case 'single_elim': {
      const bracket = fmt === 'single_elim' ? generateSingleElimBracket(ids) : generateDoubleElimBracket(ids);
      for (const s of bracket) {
        const r = s.id === 'GF' ? 99 : s.round;
        const aN = s.team_a_id ? (teams.find(x => x.id === s.team_a_id)?.name || 'TBD') : (s.team_a_name || 'TBD');
        const bN = s.team_b_id ? (teams.find(x => x.id === s.team_b_id)?.name || 'TBD') : (s.team_b_name || 'TBD');
        run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, bracket_position, bo, status) VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
          [tid, r, s.match_number, s.team_a_id, s.team_b_id, aN, bN, s.id, bo]);
      }
      break;
    }
    case 'round_robin': {
      for (const rd of generateRoundRobinMatchups(ids))
        for (let i = 0; i < rd.matchups.length; i++) {
          const [a, b] = rd.matchups[i];
          run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, bo, status) VALUES (?,?,?,?,?,?,?,?,'pending')`,
            [tid, rd.round, i + 1, a, b, teams.find(x => x.id === a)?.name || 'TBD', teams.find(x => x.id === b)?.name || 'TBD', bo]);
        }
      break;
    }
  }
  res.json({ success: true, data: all('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, match_number', [tid]) });
});

// PUT /api/tournaments/:id/matches/:matchId
tournamentRoutes.put('/:id/matches/:matchId', (req: Request, res: Response) => {
  const tid = Number(req.params.id); const mid = Number(req.params.matchId);
  const { team_a_score, team_b_score } = req.body;
  const m = one('SELECT * FROM matches WHERE id = ? AND tournament_id = ?', [mid, tid]) as any;
  if (!m) return res.status(404).json({ success: false, error: '对阵不存在' });
  const w = team_a_score > team_b_score ? m.team_a_id : m.team_b_id;
  run(`UPDATE matches SET team_a_score=?,team_b_score=?,winner_team_id=?,status='completed',completed_at=datetime('now') WHERE id=?`, [team_a_score, team_b_score, w, mid]);
  m.winner_team_id = w;
  const t = one('SELECT * FROM tournaments WHERE id = ?', [tid]) as any;
  const fmt = m.bracket_position ? t.knockout_format : t.group_format;
  if (fmt === 'swiss') autoSwissNextRound(tid, m.round);
  if (fmt === 'double_elim' || fmt === 'single_elim') advanceWinner(tid, m);
  res.json({ success: true, data: one('SELECT * FROM matches WHERE id = ?', [mid]) });
});

// PUT /api/tournaments/:id/matches/:matchId/bo — update match BO
tournamentRoutes.put('/:id/matches/:matchId/bo', (req: Request, res: Response) => {
  const { bo } = req.body;
  if (![1,3,5].includes(bo)) return res.status(400).json({ success: false, error: 'bo must be 1, 3, or 5' });
  run('UPDATE matches SET bo = ? WHERE id = ? AND tournament_id = ?', [bo, Number(req.params.matchId), Number(req.params.id)]);
  res.json({ success: true });
});

function autoSwissNextRound(tid: number, round: number): void {
  // Wait until all matches in the current round are completed
  const p = one("SELECT COUNT(*) as c FROM matches WHERE tournament_id=? AND round=? AND status!='completed'", [tid, round]) as any;
  if (p.c > 0) return;
  // Swiss complete when every team has 3+ wins or 3+ losses
  if (isSwissComplete(tid)) {
    // For group+knockout tournaments, Swiss ending is just the group phase — keep in_progress
    // so the user can generate knockout bracket. Only mark completed for pure Swiss tournaments.
    const tour = one('SELECT stage_type FROM tournaments WHERE id=?', [tid]) as any;
    if (tour?.stage_type !== 'group') {
      run("UPDATE tournaments SET status='completed', updated_at=datetime('now') WHERE id=?", [tid]);
    }
    return;
  }
  // Generate next round pairings (only among active teams)
  const pairings = generateSwissMatchups(tid, round + 1);
  if (pairings.length === 0) {
    const tour2 = one('SELECT stage_type FROM tournaments WHERE id=?', [tid]) as any;
    if (tour2?.stage_type !== 'group') {
      run("UPDATE tournaments SET status='completed', updated_at=datetime('now') WHERE id=?", [tid]);
    }
    return;
  }
  const t = one('SELECT * FROM tournaments WHERE id=?', [tid]) as any;
  const teams = all('SELECT tt.team_id as id, t.name FROM tournament_teams tt JOIN teams t ON t.id=tt.team_id WHERE tt.tournament_id=?', [tid]) as any[];
  const bo = t.default_bo || 1;
  for (let i = 0; i < pairings.length; i++) {
    const [a, b] = pairings[i];
    if (b === -1) {
      // BYE: auto-complete as a win for team_a
      const aName = teams.find((x: any) => x.id === a)?.name || 'TBD';
      const ins = run(
        `INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, team_a_score, team_b_score, winner_team_id, bo, status, completed_at) VALUES (?,?,?,?,?,?,?,1,0,?,?,'completed',datetime('now'))`,
        [tid, round + 1, i + 1, a, null, aName, 'BYE', a, bo]
      );
    } else {
      run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, bo, status) VALUES (?,?,?,?,?,?,?,?,'pending')`,
        [tid, round + 1, i + 1, a, b, teams.find((x: any) => x.id === a)?.name || 'TBD', teams.find((x: any) => x.id === b)?.name || 'TBD', bo]);
    }
  }
}

// POST /api/tournaments/:id/knockout — generate knockout bracket from group stage results
tournamentRoutes.post('/:id/knockout', (req: Request, res: Response) => {
  const tid = Number(req.params.id);
  const t = one('SELECT * FROM tournaments WHERE id = ?', [tid]) as any;
  if (!t) return res.status(404).json({ success: false, error: '赛事不存在' });
  if (t.stage_type !== 'group') return res.status(400).json({ success: false, error: '仅小组赛+淘汰赛模式可用' });

  // Compute group stage records from completed matches
  const groupMatches = all(
    "SELECT * FROM matches WHERE tournament_id = ? AND status = 'completed' AND bracket_position IS NULL",
    [tid]
  ) as any[];

  const records = new Map<number, { id: number; name: string; wins: number; losses: number }>();
  for (const m of groupMatches) {
    if (!m.team_a_id || !m.team_b_id || !m.winner_team_id) continue;
    if (!records.has(m.team_a_id)) records.set(m.team_a_id, { id: m.team_a_id, name: m.team_a_name, wins: 0, losses: 0 });
    if (!records.has(m.team_b_id)) records.set(m.team_b_id, { id: m.team_b_id, name: m.team_b_name, wins: 0, losses: 0 });
    const a = records.get(m.team_a_id)!;
    const b = records.get(m.team_b_id)!;
    a.name = m.team_a_name; b.name = m.team_b_name;
    if (m.winner_team_id === m.team_a_id) { a.wins++; b.losses++; }
    else { b.wins++; a.losses++; }
  }

  // Sort by wins desc, then losses asc
  const ranked = [...records.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  if (ranked.length < 2) return res.status(400).json({ success: false, error: '小组赛数据不足' });

  // Take top teams for knockout (power of 2 or specified by client)
  const advanceCount = req.body.advance_count || Math.min(ranked.length, 8);
  const advancing = ranked.slice(0, advanceCount);
  const ids = advancing.map(r => r.id);
  const nameMap = new Map(advancing.map(r => [r.id, r.name]));

  // Remove any existing knockout matches
  run('DELETE FROM matches WHERE tournament_id = ? AND bracket_position IS NOT NULL', [tid]);

  const fmt = t.knockout_format || 'single_elim';
  const bo = t.default_bo || 1;

  if (fmt === 'double_elim') {
    const bracket = generateDoubleElimBracket(ids);
    for (const s of bracket) {
      const r = s.id === 'GF' ? 100 + s.round : s.round;
      const aN = s.team_a_id ? (nameMap.get(s.team_a_id) || 'TBD') : (s.team_a_name || 'TBD');
      const bN = s.team_b_id ? (nameMap.get(s.team_b_id) || 'TBD') : (s.team_b_name || 'TBD');
      run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, bracket_position, bo, status) VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
        [tid, r, s.match_number, s.team_a_id, s.team_b_id, aN, bN, s.id, bo]);
    }
  } else {
    const bracket = generateSingleElimBracket(ids);
    for (const s of bracket) {
      const r = s.id === 'GF' ? 100 + s.round : s.round;
      const aN = s.team_a_id ? (nameMap.get(s.team_a_id) || 'TBD') : (s.team_a_name || 'TBD');
      const bN = s.team_b_id ? (nameMap.get(s.team_b_id) || 'TBD') : (s.team_b_name || 'TBD');
      run(`INSERT INTO matches (tournament_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, bracket_position, bo, status) VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
        [tid, r, s.match_number, s.team_a_id, s.team_b_id, aN, bN, s.id, bo]);
    }
  }

  const knockoutMatches = all('SELECT * FROM matches WHERE tournament_id = ? AND bracket_position IS NOT NULL ORDER BY round, match_number', [tid]);
  res.json({ success: true, data: { advancing, matches: knockoutMatches } });
});

function advanceWinner(tid: number, match: any): void {
  if (!match.bracket_position || !match.winner_team_id) return;
  const t = one('SELECT * FROM tournaments WHERE id=?', [tid]) as any;
  const fmt = t.knockout_format || 'single_elim';

  let winnerToPos: string | null = null;

  if (fmt === 'single_elim') {
    // R{round}-{num} -> R{round+1}-{ceil(num/2)}
    const rm = match.bracket_position.match(/^R(\d+)-(\d+)$/);
    if (!rm) return;
    const r = parseInt(rm[1]);
    const m = parseInt(rm[2]);
    winnerToPos = `R${r + 1}-${Math.ceil(m / 2)}`;
  } else {
    // double_elim: regenerate bracket for winner_to lookup
    const ids = all('SELECT team_id as id FROM tournament_teams WHERE tournament_id=?', [tid]).map((x:any)=>x.id);
    const bracket = generateDoubleElimBracket(ids);
    const slot = bracket.find((s:any) => s.id === match.bracket_position);
    if (!slot?.winner_to) return;
    winnerToPos = slot.winner_to;
  }

  if (!winnerToPos) return;
  const nm = one('SELECT * FROM matches WHERE tournament_id=? AND bracket_position=?', [tid, winnerToPos]) as any;
  if (!nm) return;
  if (!nm.team_a_id) run('UPDATE matches SET team_a_id=?, team_a_name=(SELECT name FROM teams WHERE id=?) WHERE id=?', [match.winner_team_id, match.winner_team_id, nm.id]);
  else if (!nm.team_b_id) run('UPDATE matches SET team_b_id=?, team_b_name=(SELECT name FROM teams WHERE id=?) WHERE id=?', [match.winner_team_id, match.winner_team_id, nm.id]);
}
