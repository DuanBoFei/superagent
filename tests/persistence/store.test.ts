import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initDb, upsertSession, getSession, listSessions } from "../../src/persistence/store";
import type { SessionRecord } from "../../src/persistence/types";
import { tmpdir } from "os";
import { join } from "path";
import { unlinkSync } from "fs";

function makeRecord(overrides?: Partial<SessionRecord>): SessionRecord {
  return {
    id: "test-session-1",
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    turnCount: 3,
    firstMessage: "fix the bug",
    stateJson: JSON.stringify({ sessionId: "test-session-1", turnNumber: 3 }),
    ...overrides,
  };
}

describe("store", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDb(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("INSERT → SELECT returns matching record", () => {
    const record = makeRecord();
    upsertSession(db, record);

    const loaded = getSession(db, record.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(record.id);
    expect(loaded!.turnCount).toBe(3);
    expect(loaded!.firstMessage).toBe("fix the bug");
    expect(loaded!.stateJson).toBe(record.stateJson);
  });

  it("INSERT OR REPLACE updates existing record on conflict", () => {
    upsertSession(db, makeRecord());
    upsertSession(db, makeRecord({ turnCount: 5, updatedAt: 1700000002000 }));

    const loaded = getSession(db, "test-session-1");
    expect(loaded!.turnCount).toBe(5);
    expect(loaded!.updatedAt).toBe(1700000002000);
  });

  it("getSession returns null for non-existent id", () => {
    const loaded = getSession(db, "no-such-session");
    expect(loaded).toBeNull();
  });

  it("listSessions returns summaries ordered by updated_at desc", () => {
    upsertSession(db, makeRecord({ id: "s1", updatedAt: 1000, turnCount: 1, firstMessage: "first" }));
    upsertSession(db, makeRecord({ id: "s2", updatedAt: 3000, turnCount: 2, firstMessage: "second" }));
    upsertSession(db, makeRecord({ id: "s3", updatedAt: 2000, turnCount: 3, firstMessage: "third" }));

    const list = listSessions(db);
    expect(list).toHaveLength(3);
    expect(list[0]!.id).toBe("s2"); // newest first
    expect(list[1]!.id).toBe("s3");
    expect(list[2]!.id).toBe("s1");
    expect(list[0]!.turns).toBe(2);
    expect(list[0]!.firstMessage).toBe("second");
  });

  it("listSessions respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      upsertSession(db, makeRecord({ id: `s${i}`, updatedAt: i * 100 }));
    }

    const list = listSessions(db, 3);
    expect(list).toHaveLength(3);
  });

  it("listSessions returns empty array when no sessions exist", () => {
    const list = listSessions(db);
    expect(list).toHaveLength(0);
  });
});

describe("store real file", () => {
  const files: string[] = [];

  function makeFileDb(): Database.Database {
    const path = join(tmpdir(), `store-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    files.push(path);
    return initDb(path);
  }

  afterEach(() => {
    for (const f of files.splice(0)) {
      try { unlinkSync(f); } catch { /* ok */ }
    }
  });

  it("busy_timeout pragma is set to 5000ms", () => {
    const db = makeFileDb();
    const result = db.pragma("busy_timeout") as Array<{ timeout: number }>;
    expect(result[0]!.timeout).toBe(5000);
  });

  it("journal_mode is WAL", () => {
    const db = makeFileDb();
    const result = db.pragma("journal_mode") as Array<{ journal_mode: string }>;
    expect(result[0]!.journal_mode).toBe("wal");
  });

  it("two connections to same file can read concurrently", () => {
    const path = join(tmpdir(), `store-conc-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    files.push(path);

    const db1 = initDb(path);
    upsertSession(db1, makeRecord({ id: "shared-session", turnCount: 1 }));

    const db2 = new Database(path);
    const loaded = getSession(db2, "shared-session");
    expect(loaded).not.toBeNull();
    expect(loaded!.turnCount).toBe(1);

    db2.close();
    db1.close();
  });

  it("upsert survives rapid sequential writes", () => {
    const db = makeFileDb();
    for (let i = 0; i < 20; i++) {
      upsertSession(db, makeRecord({ id: "rapid-test", turnCount: i }));
    }
    const loaded = getSession(db, "rapid-test");
    expect(loaded!.turnCount).toBe(19);
  });
});
