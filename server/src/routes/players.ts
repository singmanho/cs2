import { Router, Request, Response } from 'express';
import { all, one, run } from '../db/query';
import type { ApiResponse } from '../../../shared/types';

export const playerRoutes = Router();

// GET /api/players
playerRoutes.get('/', (req: Request, res: Response) => {
  const { search } = req.query;
  let players: any[];

  if (search && typeof search === 'string') {
    players = all(
      'SELECT * FROM players WHERE name LIKE ? ORDER BY rating DESC',
      [`%${search}%`]
    );
  } else {
    players = all('SELECT * FROM players ORDER BY rating DESC');
  }

  res.json({ success: true, data: players } as ApiResponse<any[]>);
});

// GET /api/players/:id
playerRoutes.get('/:id', (req: Request, res: Response) => {
  const player = one('SELECT * FROM players WHERE id = ?', [Number(req.params.id)]);
  if (!player) {
    return res.status(404).json({ success: false, error: '玩家不存在' });
  }
  res.json({ success: true, data: player } as ApiResponse<any>);
});

// POST /api/players — manual input
playerRoutes.post('/', (req: Request, res: Response) => {
  const { name, rank, rating, kd_ratio, avg_damage, headshot_pct, matches_played, wins, losses } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name 必填' });
  }

  const result = run(
    `INSERT INTO players (name, rank, rating, kd_ratio, avg_damage, headshot_pct, matches_played, wins, losses)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      rank || '暂无段位',
      rating ?? 0,
      kd_ratio ?? 0,
      avg_damage ?? 0,
      headshot_pct ?? 0,
      matches_played ?? 0,
      wins ?? 0,
      losses ?? 0,
    ]
  );

  const player = one('SELECT * FROM players WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ success: true, data: player });
});

// PUT /api/players/:id
playerRoutes.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = one('SELECT id FROM players WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, error: '玩家不存在' });
  }

  const { name, rank, rating, kd_ratio, avg_damage, headshot_pct, matches_played, wins, losses } = req.body;
  run(
    `UPDATE players SET
      name = COALESCE(?, name),
      rank = COALESCE(?, rank),
      rating = COALESCE(?, rating),
      kd_ratio = COALESCE(?, kd_ratio),
      avg_damage = COALESCE(?, avg_damage),
      headshot_pct = COALESCE(?, headshot_pct),
      matches_played = COALESCE(?, matches_played),
      wins = COALESCE(?, wins),
      losses = COALESCE(?, losses),
      updated_at = datetime('now')
     WHERE id = ?`,
    [name ?? null, rank ?? null, rating ?? null, kd_ratio ?? null, avg_damage ?? null,
     headshot_pct ?? null, matches_played ?? null, wins ?? null, losses ?? null, id]
  );

  const player = one('SELECT * FROM players WHERE id = ?', [id]);
  res.json({ success: true, data: player });
});

// DELETE /api/players/:id
playerRoutes.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  run('DELETE FROM players WHERE id = ?', [id]);
  res.json({ success: true });
});
