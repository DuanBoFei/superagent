import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../../src/persistence/store";
import { runMigrations } from "../../src/persistence/migrations/runner";

describe("T002: Session History DB Migration", () => {
  describe("on empty database", () => {
    let db: Database.Database;

    beforeEach(() => {
      db = initDb(":memory:");
    });

    afterEach(() => {
      db.close();
    });

    it("adds all new columns to sessions table", () => {
      const cols = db
        .prepare("PRAGMA table_info('sessions')")
        .all() as Array<{ name: string }>;
      const names = new Set(cols.map((c) => c.name));

      expect(names.has("title")).toBe(true);
      expect(names.has("status")).toBe(true);
      expect(names.has("duration_ms")).toBe(true);
      expect(names.has("tool_call_count")).toBe(true);
      expect(names.has("message_count")).toBe(true);
      expect(names.has("forked_from")).toBe(true);
      expect(names.has("forked_at_message_index")).toBe(true);
      expect(names.has("messages_content")).toBe(true);
    });

    it("creates session_tags table", () => {
      const cols = db
        .prepare("PRAGMA table_info('session_tags')")
        .all() as Array<{ name: string }>;
      const names = new Set(cols.map((c) => c.name));

      expect(names.has("session_id")).toBe(true);
      expect(names.has("tag")).toBe(true);
      expect(names.has("created_at")).toBe(true);
    });

    it("session_tags has ON DELETE CASCADE", () => {
      const fkList = db.prepare("PRAGMA foreign_key_list('session_tags')").all();
      const fk = fkList.find(
        (f: unknown) => (f as Record<string, unknown>).from === "session_id",
      );
      expect(fk).toBeDefined();
      expect((fk as Record<string, unknown>).on_delete).toBe("CASCADE");
    });

    it("creates all performance indexes", () => {
      const indexes = db
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
        .all() as Array<{ name: string }>;
      const names = new Set(indexes.map((i) => i.name));

      expect(names.has("idx_sessions_updated_at")).toBe(true);
      expect(names.has("idx_sessions_status")).toBe(true);
      expect(names.has("idx_sessions_title")).toBe(true);
      expect(names.has("idx_session_tags_tag")).toBe(true);
    });

    it("creates sessions_fts virtual table", () => {
      const fts = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions_fts'",
        )
        .get();
      expect(fts).not.toBeNull();
    });

    it("FTS triggers sync on INSERT", () => {
      db.prepare(
        `INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json, title, messages_content)
         VALUES ('test-1', 100, 200, 1, 'hello', '{}', 'My Title', 'searchable content')`,
      ).run();

      const result = db
        .prepare("SELECT * FROM sessions_fts WHERE sessions_fts MATCH ?")
        .get("searchable") as { session_id: string; title: string } | undefined;

      expect(result).not.toBeNull();
      expect(result!.session_id).toBe("test-1");
    });

    it("FTS triggers sync on UPDATE", () => {
      db.prepare(
        `INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json, title, messages_content)
         VALUES ('test-2', 100, 200, 1, 'hello', '{}', 'Old Title', 'old content')`,
      ).run();

      db.prepare(
        "UPDATE sessions SET messages_content = 'updated content', title = 'New Title' WHERE id = 'test-2'",
      ).run();

      const result = db
        .prepare("SELECT * FROM sessions_fts WHERE sessions_fts MATCH ?")
        .get("updated") as { session_id: string; title: string } | undefined;
      expect(result).not.toBeNull();

      const oldResult = db
        .prepare("SELECT * FROM sessions_fts WHERE sessions_fts MATCH ?")
        .get("old") as { session_id: string } | undefined;
      expect(oldResult).toBeUndefined();
    });

    it("FTS triggers sync on DELETE", () => {
      db.prepare(
        `INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json, title, messages_content)
         VALUES ('test-3', 100, 200, 1, 'hello', '{}', 'Title', 'delete me')`,
      ).run();

      db.prepare("DELETE FROM sessions WHERE id = 'test-3'").run();

      const result = db
        .prepare("SELECT * FROM sessions_fts WHERE session_id = ?")
        .get("test-3");
      expect(result).toBeUndefined();
    });

    it("cascades deletes from sessions to session_tags", () => {
      db.prepare("INSERT INTO sessions (id, created_at, updated_at, turn_count, state_json) VALUES ('test-4', 100, 200, 0, '{}')").run();
      db.prepare("INSERT INTO session_tags (session_id, tag) VALUES ('test-4', 'bugfix')").run();

      db.prepare("DELETE FROM sessions WHERE id = 'test-4'").run();

      const tags = db.prepare("SELECT * FROM session_tags WHERE session_id = 'test-4'").all();
      expect(tags).toHaveLength(0);
    });

    it("records migration in _migrations table", () => {
      const rows = db.prepare("SELECT name FROM _migrations").all() as Array<{ name: string }>;
      expect(rows.some((r) => r.name === "001_add_session_history.sql")).toBe(true);
    });

    it("is idempotent - running migrations again does not fail", () => {
      // runMigrations should skip already applied migrations
      expect(() => runMigrations(db)).not.toThrow();
    });

    it("default column values are correct", () => {
      db.prepare(
        "INSERT INTO sessions (id, created_at, updated_at, turn_count, state_json) VALUES ('test-defaults', 100, 200, 0, '{}')",
      ).run();

      const row = db
        .prepare("SELECT title, status, duration_ms, tool_call_count, message_count FROM sessions WHERE id = ?")
        .get("test-defaults") as Record<string, unknown>;

      expect(row.title).toBe("");
      expect(row.status).toBe("active");
      expect(row.duration_ms).toBe(0);
      expect(row.tool_call_count).toBe(0);
      expect(row.message_count).toBe(0);
    });
  });

  describe("on database with existing data", () => {
    let db: Database.Database;

    beforeEach(() => {
      db = initDb(":memory:");
      // Insert pre-existing sessions before migration columns exist
      db.prepare(
        "INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json) VALUES ('existing-1', 100, 200, 5, 'existing message', '{}')",
      ).run();
    });

    afterEach(() => {
      db.close();
    });

    it("existing rows retain their data after migration", () => {
      const row = db
        .prepare("SELECT id, turn_count, first_message FROM sessions WHERE id = ?")
        .get("existing-1") as Record<string, unknown>;

      expect(row.id).toBe("existing-1");
      expect(row.turn_count).toBe(5);
      expect(row.first_message).toBe("existing message");
    });

    it("existing rows get default values for new columns", () => {
      const row = db
        .prepare("SELECT title, status, duration_ms FROM sessions WHERE id = ?")
        .get("existing-1") as Record<string, unknown>;

      expect(row.title).toBe("");
      expect(row.status).toBe("active");
      expect(row.duration_ms).toBe(0);
    });

    it("can update existing rows with new column values", () => {
      db.prepare(
        "UPDATE sessions SET title = 'Updated Title', status = 'completed', messages_content = 'test search' WHERE id = 'existing-1'",
      ).run();

      const row = db
        .prepare("SELECT title, status FROM sessions WHERE id = ?")
        .get("existing-1") as Record<string, unknown>;

      expect(row.title).toBe("Updated Title");
      expect(row.status).toBe("completed");
    });

    it("existing rows can be FTS searched after messages_content populated", () => {
      db.prepare(
        "UPDATE sessions SET messages_content = 'searchable historical content' WHERE id = 'existing-1'",
      ).run();

      const result = db
        .prepare("SELECT * FROM sessions_fts WHERE sessions_fts MATCH ?")
        .get("historical") as { session_id: string } | undefined;

      expect(result).not.toBeNull();
      expect(result!.session_id).toBe("existing-1");
    });
  });
});
