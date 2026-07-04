import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'cs2-tourney.db');
let db: SqlJsDatabase;

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function initDb(): Promise<void> {
  ensureDataDir();
  const SQL = await initSqlJs();
  let buffer: Uint8Array | undefined;
  if (fs.existsSync(DB_PATH)) buffer = fs.readFileSync(DB_PATH);
  db = new SQL.Database(buffer);
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rank TEXT NOT NULL DEFAULT '未定级', avatar_url TEXT, rating REAL NOT NULL DEFAULT 0, kd_ratio REAL NOT NULL DEFAULT 0, avg_damage REAL NOT NULL DEFAULT 0, headshot_pct REAL NOT NULL DEFAULT 0, matches_played INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, logo_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS team_members (id INTEGER PRIMARY KEY AUTOINCREMENT, team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE, player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, UNIQUE(team_id, player_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS tournaments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', stage_type TEXT NOT NULL CHECK(stage_type IN ('group','knockout')), group_format TEXT NOT NULL DEFAULT 'swiss' CHECK(group_format IN ('swiss','double_elim','round_robin','single_elim')), knockout_format TEXT NOT NULL DEFAULT 'swiss' CHECK(knockout_format IN ('swiss','double_elim','round_robin','single_elim')), team_size INTEGER NOT NULL DEFAULT 5, max_participants INTEGER NOT NULL DEFAULT 16, default_bo INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','in_progress','completed')), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS tournament_teams (id INTEGER PRIMARY KEY AUTOINCREMENT, tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE, team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE, seed INTEGER, group_name TEXT, UNIQUE(tournament_id, team_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE, round INTEGER NOT NULL DEFAULT 1, match_number INTEGER NOT NULL DEFAULT 1, team_a_id INTEGER, team_b_id INTEGER, team_a_name TEXT NOT NULL DEFAULT '', team_b_name TEXT NOT NULL DEFAULT '', team_a_score INTEGER, team_b_score INTEGER, winner_team_id INTEGER, bo INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','cancelled')), bracket_position TEXT, scheduled_at TEXT, completed_at TEXT)`);

  saveDb();
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized.');
  return db;
}

export function saveDb(): void {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}
