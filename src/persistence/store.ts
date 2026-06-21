import Database from "better-sqlite3";
import type { SessionRecord, SessionSummary } from "./types";
import { runMigrations } from "./migrations/runner";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  turn_count INTEGER NOT NULL DEFAULT 0,
  first_message TEXT,
  state_json TEXT NOT NULL
);
`;

const UPSERT_SQL = `
INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json)
VALUES (@id, @created_at, @updated_at, @turn_count, @first_message, @state_json)
ON CONFLICT(id) DO UPDATE SET
  updated_at = @updated_at,
  turn_count = @turn_count,
  state_json = @state_json;
`;

const GET_SQL = `SELECT * FROM sessions WHERE id = ?`;

const LIST_SQL = `
SELECT id, created_at, updated_at, turn_count, first_message
FROM sessions
ORDER BY updated_at DESC
LIMIT ?
`;

export function initDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  runMigrations(db);
  return db;
}

export function upsertSession(
  db: Database.Database,
  record: SessionRecord,
): void {
  db.prepare(UPSERT_SQL).run({
    id: record.id,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    turn_count: record.turnCount,
    first_message: record.firstMessage,
    state_json: record.stateJson,
  });
}

export function getSession(
  db: Database.Database,
  id: string,
): SessionRecord | null {
  const row = db.prepare(GET_SQL).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    turnCount: row.turn_count as number,
    firstMessage: (row.first_message as string) ?? "",
    stateJson: row.state_json as string,
  };
}

export function listSessions(
  db: Database.Database,
  limit = 20,
): SessionSummary[] {
  const rows = db.prepare(LIST_SQL).all(limit) as Array<
    Record<string, unknown>
  >;
  return rows.map((row) => ({
    id: row.id as string,
    date: new Date(row.created_at as number).toISOString(),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    turns: row.turn_count as number,
    firstMessage: (row.first_message as string) ?? "",
  }));
}
