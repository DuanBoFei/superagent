import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../../src/persistence/store";
import { SessionDbService } from "../../packages/web/src/services/session-db.service";
import type { SessionStatus } from "../../packages/web/src/types/session-history";

function insertSession(
  db: Database.Database,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  db.prepare(
    `INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json, title, status, duration_ms, tool_call_count, message_count, messages_content, forked_from, forked_at_message_index)
     VALUES (@id, @created_at, @updated_at, @turn_count, @first_message, @state_json, @title, @status, @duration_ms, @tool_call_count, @message_count, @messages_content, @forked_from, @forked_at_message_index)`,
  ).run({
    id,
    created_at: 1000,
    updated_at: 2000,
    turn_count: 1,
    first_message: "hello world",
    state_json: "{}",
    title: "",
    status: "active",
    duration_ms: 0,
    tool_call_count: 0,
    message_count: 0,
    messages_content: "",
    forked_from: null,
    forked_at_message_index: null,
    ...overrides,
  });
}

function insertTag(db: Database.Database, sessionId: string, tag: string) {
  db.prepare(
    "INSERT OR IGNORE INTO session_tags (session_id, tag) VALUES (?, ?)",
  ).run(sessionId, tag);
}

describe("SessionDbService", () => {
  let db: Database.Database;
  let svc: SessionDbService;

  beforeEach(() => {
    db = initDb(":memory:");
    svc = new SessionDbService(db);
  });

  afterEach(() => {
    db.close();
  });

  // ── getSessionSummaries ──────────────────────────────

  describe("getSessionSummaries", () => {
    it("returns an empty array when no sessions exist", async () => {
      const result = await svc.getSessionSummaries();
      expect(result).toEqual([]);
    });

    it("returns sessions ordered by updated_at DESC", async () => {
      insertSession(db, "s1", { updated_at: 100, title: "First" });
      insertSession(db, "s2", { updated_at: 300, title: "Third" });
      insertSession(db, "s3", { updated_at: 200, title: "Second" });

      const result = await svc.getSessionSummaries();
      expect(result.map((s) => s.id)).toEqual(["s2", "s3", "s1"]);
    });

    it("respects limit and offset", async () => {
      for (let i = 0; i < 10; i++) {
        insertSession(db, `s${i}`, { updated_at: i * 10 });
      }

      const page = await svc.getSessionSummaries(3, 2);
      expect(page).toHaveLength(3);
      expect(page[0]!.id).toBe("s7");
    });

    it("includes tags for each session", async () => {
      insertSession(db, "s1", { title: "Tagged" });
      insertTag(db, "s1", "bugfix");
      insertTag(db, "s1", "typescript");

      const result = await svc.getSessionSummaries();
      expect(result[0]!.tags).toEqual(
        expect.arrayContaining(["bugfix", "typescript"]),
      );
    });

    it("maps columns to SessionSummary correctly", async () => {
      insertSession(db, "s1", {
        title: "My Session",
        first_message: "Fix the auth bug in login flow. The token refresh is broken.",
        status: "completed",
        duration_ms: 45000,
        tool_call_count: 12,
        message_count: 34,
        forked_from: null,
      });

      const result = await svc.getSessionSummaries();
      expect(result).toHaveLength(1);
      const s = result[0]!;
      expect(s.id).toBe("s1");
      expect(s.title).toBe("My Session");
      expect(s.firstMessagePreview).toBe(
        "Fix the auth bug in login flow. The token refresh is broken.",
      );
      expect(s.status).toBe("completed");
      expect(s.durationMs).toBe(45000);
      expect(s.toolCallCount).toBe(12);
      expect(s.messageCount).toBe(34);
      expect(s.forkedFrom).toBeNull();
    });
  });

  // ── getSession ──────────────────────────────────────

  describe("getSession", () => {
    it("returns null for non-existent session", async () => {
      const result = await svc.getSession("nonexistent");
      expect(result).toBeNull();
    });

    it("returns full session data with tags", async () => {
      insertSession(db, "parent-1", { title: "Parent" });
      insertSession(db, "s1", {
        title: "Full Session",
        forked_from: "parent-1",
        forked_at_message_index: 5,
      });
      insertTag(db, "s1", "important");
      insertTag(db, "s1", "backend");

      const session = await svc.getSession("s1");
      expect(session).not.toBeNull();
      expect(session!.id).toBe("s1");
      expect(session!.title).toBe("Full Session");
      expect(session!.tags).toEqual(
        expect.arrayContaining(["important", "backend"]),
      );
      expect(session!.forkedFrom).toBe("parent-1");
      expect(session!.forkedAtMessageIndex).toBe(5);
      expect(session!.messages).toEqual([]);
      expect(session!.toolCalls).toEqual([]);
    });
  });

  // ── updateSession ───────────────────────────────────

  describe("updateSession", () => {
    it("updates session title", async () => {
      insertSession(db, "s1");

      await svc.updateSession("s1", { title: "New Title" });

      const row = db.prepare("SELECT title FROM sessions WHERE id = ?").get("s1") as { title: string };
      expect(row.title).toBe("New Title");
    });

    it("updates session status", async () => {
      insertSession(db, "s1");

      await svc.updateSession("s1", { status: "completed" });

      const row = db.prepare("SELECT status FROM sessions WHERE id = ?").get("s1") as { status: string };
      expect(row.status).toBe("completed");
    });

    it("updates both title and status together", async () => {
      insertSession(db, "s1", { title: "Old", status: "active" });

      await svc.updateSession("s1", { title: "New", status: "completed" });

      const row = db.prepare("SELECT title, status FROM sessions WHERE id = ?").get("s1") as { title: string; status: string };
      expect(row.title).toBe("New");
      expect(row.status).toBe("completed");
    });

    it("does not overwrite title when only status is provided", async () => {
      insertSession(db, "s1", { title: "Keep Me" });

      await svc.updateSession("s1", { status: "error" });

      const row = db.prepare("SELECT title, status FROM sessions WHERE id = ?").get("s1") as { title: string; status: string };
      expect(row.title).toBe("Keep Me");
      expect(row.status).toBe("error");
    });

    it("does not throw when updating non-existent session", async () => {
      await expect(
        svc.updateSession("ghost", { title: "No" }),
      ).resolves.not.toThrow();
    });
  });

  // ── deleteSession / deleteSessions ──────────────────

  describe("deleteSession", () => {
    it("deletes a single session", async () => {
      insertSession(db, "s1");

      await svc.deleteSession("s1");

      const row = db.prepare("SELECT id FROM sessions WHERE id = ?").get("s1");
      expect(row).toBeUndefined();
    });

    it("does not throw when deleting non-existent session", async () => {
      await expect(svc.deleteSession("ghost")).resolves.not.toThrow();
    });

    it("cascades to session_tags", async () => {
      insertSession(db, "s1");
      insertTag(db, "s1", "test-tag");

      await svc.deleteSession("s1");

      const tags = db
        .prepare("SELECT * FROM session_tags WHERE session_id = ?")
        .all("s1");
      expect(tags).toHaveLength(0);
    });
  });

  describe("deleteSessions", () => {
    it("deletes multiple sessions in batch", async () => {
      insertSession(db, "s1");
      insertSession(db, "s2");
      insertSession(db, "s3");

      await svc.deleteSessions(["s1", "s3"]);

      const remaining = db
        .prepare("SELECT id FROM sessions")
        .all() as Array<{ id: string }>;
      expect(remaining.map((r) => r.id).sort()).toEqual(["s2"]);
    });

    it("handles empty array", async () => {
      insertSession(db, "s1");
      await expect(svc.deleteSessions([])).resolves.not.toThrow();
      const count = (db.prepare("SELECT COUNT(*) as c FROM sessions").get() as { c: number }).c;
      expect(count).toBe(1);
    });
  });

  // ── searchSessions ──────────────────────────────────

  describe("searchSessions", () => {
    it("returns all sessions when query is empty", async () => {
      insertSession(db, "s1", { title: "A" });
      insertSession(db, "s2", { title: "B" });

      const result = await svc.searchSessions({ text: "", dateRange: null, statusFilter: null, tagsFilter: null });
      expect(result).toHaveLength(2);
    });

    it("searches by text using FTS5", async () => {
      insertSession(db, "s1", {
        title: "Auth Bug",
        messages_content: "fix login authentication issue",
      });
      insertSession(db, "s2", {
        title: "Refactor",
        messages_content: "rename variables for clarity",
      });

      const result = await svc.searchSessions({ text: "authentication", dateRange: null, statusFilter: null, tagsFilter: null });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("s1");
    });

    it("searches by title content", async () => {
      insertSession(db, "s1", { title: "Database Migration", messages_content: "" });
      insertSession(db, "s2", { title: "UI Fixes", messages_content: "" });

      const result = await svc.searchSessions({ text: "Migration", dateRange: null, statusFilter: null, tagsFilter: null });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("s1");
    });

    it("filters by status", async () => {
      insertSession(db, "s1", { status: "active", title: "Active" });
      insertSession(db, "s2", { status: "completed", title: "Done" });
      insertSession(db, "s3", { status: "error", title: "Failed" });

      const result = await svc.searchSessions({
        text: "",
        dateRange: null,
        statusFilter: ["completed", "error"],
        tagsFilter: null,
      });
      expect(result.map((s) => s.id).sort()).toEqual(["s2", "s3"]);
    });

    it("filters by date range", async () => {
      insertSession(db, "s1", { created_at: 1000, title: "Old" });
      insertSession(db, "s2", { created_at: 2000, title: "Mid" });
      insertSession(db, "s3", { created_at: 3000, title: "New" });

      const result = await svc.searchSessions({
        text: "",
        dateRange: { start: 1500, end: 2500 },
        statusFilter: null,
        tagsFilter: null,
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("s2");
    });

    it("filters by tags", async () => {
      insertSession(db, "s1", { title: "Tagged" });
      insertSession(db, "s2", { title: "Untagged" });
      insertTag(db, "s1", "bugfix");

      const result = await svc.searchSessions({
        text: "",
        dateRange: null,
        statusFilter: null,
        tagsFilter: ["bugfix"],
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("s1");
    });

    it("combines text search with status filter", async () => {
      insertSession(db, "s1", {
        title: "Login Bug",
        status: "completed",
        messages_content: "fix login flow",
      });
      insertSession(db, "s2", {
        title: "Login Refactor",
        status: "active",
        messages_content: "refactor login for performance",
      });

      const result = await svc.searchSessions({
        text: "login",
        dateRange: null,
        statusFilter: ["active"],
        tagsFilter: null,
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("s2");
    });

    it("returns empty array when no matches", async () => {
      insertSession(db, "s1", { title: "Auth", messages_content: "auth stuff" });

      const result = await svc.searchSessions({ text: "nonexistent", dateRange: null, statusFilter: null, tagsFilter: null });
      expect(result).toEqual([]);
    });
  });

  // ── Tags ────────────────────────────────────────────

  describe("tags", () => {
    it("adds a tag to a session", async () => {
      insertSession(db, "s1");
      await svc.addTag("s1", "backend");

      const tags = db
        .prepare("SELECT tag FROM session_tags WHERE session_id = ?")
        .all("s1") as Array<{ tag: string }>;
      expect(tags).toHaveLength(1);
      expect(tags[0]!.tag).toBe("backend");
    });

    it("adding duplicate tag is a no-op (INSERT OR IGNORE)", async () => {
      insertSession(db, "s1");
      await svc.addTag("s1", "dup");
      await svc.addTag("s1", "dup");

      const tags = db
        .prepare("SELECT tag FROM session_tags WHERE session_id = ?")
        .all("s1") as Array<{ tag: string }>;
      expect(tags).toHaveLength(1);
    });

    it("removes a tag from a session", async () => {
      insertSession(db, "s1");
      insertTag(db, "s1", "temp");
      insertTag(db, "s1", "keep");

      await svc.removeTag("s1", "temp");

      const tags = db
        .prepare("SELECT tag FROM session_tags WHERE session_id = ?")
        .all("s1") as Array<{ tag: string }>;
      expect(tags.map((t) => t.tag)).toEqual(["keep"]);
    });

    it("getAllTags returns all unique tags across sessions", async () => {
      insertSession(db, "s1");
      insertSession(db, "s2");
      insertTag(db, "s1", "typescript");
      insertTag(db, "s1", "backend");
      insertTag(db, "s2", "frontend");
      insertTag(db, "s2", "typescript"); // duplicate across sessions

      const tags = await svc.getAllTags();

      expect(tags.sort()).toEqual(["backend", "frontend", "typescript"]);
    });

    it("getAllTags returns empty array when no tags exist", async () => {
      insertSession(db, "s1");
      const tags = await svc.getAllTags();
      expect(tags).toEqual([]);
    });

    it("getSessionSummaries returns empty tags array for untagged session", async () => {
      insertSession(db, "s1", { title: "Untagged" });

      const result = await svc.getSessionSummaries();
      expect(result[0]!.tags).toEqual([]);
    });
  });
});
