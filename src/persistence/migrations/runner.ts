import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`;

interface Migration {
  id: number;
  name: string;
  sql: string;
}

function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname);
  const files = ["001_add_session_history.sql"];
  return files.map((file, index) => ({
    id: index + 1,
    name: file,
    sql: readFileSync(join(migrationsDir, file), "utf-8"),
  }));
}

export function runMigrations(db: Database.Database): void {
  db.exec(MIGRATIONS_TABLE);

  const applied = new Set(
    (
      db
        .prepare("SELECT name FROM _migrations ORDER BY id")
        .all() as Array<{ name: string }>
    ).map((r) => r.name),
  );

  const migrations = loadMigrations();

  for (const m of migrations) {
    if (applied.has(m.name)) continue;

    const runAll = db.transaction(() => {
      db.exec(m.sql);
      db.prepare("INSERT INTO _migrations (id, name) VALUES (?, ?)").run(
        m.id,
        m.name,
      );
    });
    runAll();
  }
}
