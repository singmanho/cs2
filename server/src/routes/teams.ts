import { Router, Request, Response } from 'express';
import { all, one, run } from '../db/query';
import type { ApiResponse } from '../../../shared/types';

export const teamRoutes = Router();

// GET /api/teams
teamRoutes.get('/', (_req: Request, res: Response) => {
  const teams = all(
    `SELECT t.*, (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
     FROM teams t ORDER BY t.name`
  );
  res.json({ success: true, data: teams } as ApiResponse<any[]>);
});

// GET /api/teams/:id
teamRoutes.get('/:id', (req: Request, res: Response) => {
  const team = one('SELECT * FROM teams WHERE id = ?', [Number(req.params.id)]);
  if (!team) return res.status(404).json({ success: false, error: '战队不存在' });

  const members = all(
    `SELECT tm.*, p.name, p.rank, p.rating, p.kd_ratio, p.avg_damage, p.headshot_pct
     FROM team_members tm JOIN players p ON p.id = tm.player_id WHERE tm.team_id = ?`,
    [Number(req.params.id)]
  );

  res.json({ success: true, data: { ...team, members } } as ApiResponse<any>);
});

// POST /api/teams
teamRoutes.post('/', (req: Request, res: Response) => {
  const { name, player_ids } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: '战队名称必填' });
  }

  const existing = one('SELECT id FROM teams WHERE name = ?', [name.trim()]);
  if (existing) return res.status(409).json({ success: false, error: '战队名已存在' });

  const result = run('INSERT INTO teams (name) VALUES (?)', [name.trim()]);
  const teamId = result.lastInsertRowid;

  if (player_ids && Array.isArray(player_ids)) {
    for (const pid of player_ids) {
      run('INSERT OR IGNORE INTO team_members (team_id, player_id) VALUES (?, ?)', [teamId, pid]);
    }
  }

  const team = one('SELECT * FROM teams WHERE id = ?', [teamId]);
  res.status(201).json({ success: true, data: team });
});

// PUT /api/teams/:id
teamRoutes.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (name) {
    run('UPDATE teams SET name = ? WHERE id = ?', [name.trim(), id]);
  }
  const team = one('SELECT * FROM teams WHERE id = ?', [id]);
  res.json({ success: true, data: team });
});

// DELETE /api/teams/:id
teamRoutes.delete('/:id', (req: Request, res: Response) => {
  run('DELETE FROM teams WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

// POST /api/teams/:id/members
teamRoutes.post('/:id/members', (req: Request, res: Response) => {
  const teamId = Number(req.params.id);
  const { player_id } = req.body;

  const team = one('SELECT id FROM teams WHERE id = ?', [teamId]);
  if (!team) return res.status(404).json({ success: false, error: '战队不存在' });

  run('INSERT OR IGNORE INTO team_members (team_id, player_id) VALUES (?, ?)', [teamId, player_id]);

  const members = all(
    'SELECT tm.*, p.name, p.rank, p.rating FROM team_members tm JOIN players p ON p.id = tm.player_id WHERE tm.team_id = ?',
    [teamId]
  );
  res.json({ success: true, data: members });
});

// DELETE /api/teams/:id/members/:playerId
teamRoutes.delete('/:id/members/:playerId', (req: Request, res: Response) => {
  run('DELETE FROM team_members WHERE team_id = ? AND player_id = ?',
    [Number(req.params.id), Number(req.params.playerId)]);
  res.json({ success: true });
});
