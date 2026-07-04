import { getDb, saveDb } from './schema';

// sql.js query helper: converts exec result to array of objects
export function all<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  // Only bind if there are actual parameters AND placeholders in SQL
  if (params.length > 0) {
    const placeholderCount = (sql.match(/\?/g) || []).length;
    const toBind = params.slice(0, placeholderCount);
    if (toBind.length > 0) stmt.bind(toBind);
  }
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function one<T = any>(sql: string, params: any[] = []): T | undefined {
  const rows = all<T>(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

export function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  const db = getDb();
  // Trim params to match placeholder count
  const placeholderCount = (sql.match(/\?/g) || []).length;
  const toBind = params.slice(0, placeholderCount);
  db.run(sql, toBind);
  const result = {
    lastInsertRowid: db.getRowsModified() > 0 ? lastInsertId(db) : 0,
    changes: db.getRowsModified(),
  };
  queueSave();
  return result;
}

function lastInsertId(db: ReturnType<typeof getDb>): number {
  const rows = all<{ id: number }>('SELECT last_insert_rowid() as id');
  return rows[0]?.id ?? 0;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function queueSave(): void {
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      try {
        saveDb();
      } catch (err) {
        console.error('[db] saveDb failed in queueSave:', err);
      } finally {
        saveTimer = undefined;
      }
    }, 50);
  }
}

export function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
  try {
    saveDb();
  } catch (err) {
    console.error('[db] saveDb failed in flushSave:', err);
  }
}

export { saveDb };
