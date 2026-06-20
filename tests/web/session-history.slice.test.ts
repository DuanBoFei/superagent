import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../../src/persistence/store";
import { SessionDbService } from "../../packages/web/src/services/session-db.service";
import { createSessionHistorySlice } from "../../packages/web/src/store/slices/session-history.slice";
import type { SessionHistorySlice } from "../../packages/web/src/store/slices/session-history.slice";

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

describe("SessionHistorySlice", () => {
  let db: Database.Database;
  let svc: SessionDbService;
  let slice: SessionHistorySlice;

  beforeEach(() => {
    db = initDb(":memory:");
    svc = new SessionDbService(db);
    slice = createSessionHistorySlice(svc);
  });

  afterEach(() => {
    db.close();
  });

  // ── Initial State ─────────────────────────────────

  describe("initial state", () => {
    it("has empty sessions array", () => {
      expect(slice.getSessions()).toEqual([]);
    });

    it("has default filters", () => {
      const filters = slice.getFilters();
      expect(filters.text).toBe("");
      expect(filters.dateRange).toBeNull();
      expect(filters.statusFilter).toBeNull();
      expect(filters.tagsFilter).toBeNull();
    });

    it("has null active session id", () => {
      expect(slice.getActiveSessionId()).toBeNull();
    });

    it("has sidebar open by default", () => {
      expect(slice.getSidebarOpen()).toBe(true);
    });

    it("has default sidebar width of 280", () => {
      expect(slice.getSidebarWidth()).toBe(280);
    });

    it("has sidebar mode dock by default", () => {
      expect(slice.getSidebarMode()).toBe("dock");
    });
  });

  // ── Filters ───────────────────────────────────────

  describe("setFilters", () => {
    it("updates text filter", () => {
      slice.setFilters({ text: "login bug" });
      expect(slice.getFilters().text).toBe("login bug");
    });

    it("updates status filter", () => {
      slice.setFilters({ statusFilter: ["completed"] });
      expect(slice.getFilters().statusFilter).toEqual(["completed"]);
    });

    it("updates date range filter", () => {
      slice.setFilters({ dateRange: { start: 1000, end: 2000 } });
      expect(slice.getFilters().dateRange).toEqual({ start: 1000, end: 2000 });
    });

    it("updates tags filter", () => {
      slice.setFilters({ tagsFilter: ["bugfix"] });
      expect(slice.getFilters().tagsFilter).toEqual(["bugfix"]);
    });

    it("merges partial updates without overwriting other fields", () => {
      slice.setFilters({ text: "login" });
      slice.setFilters({ statusFilter: ["active"] });

      const filters = slice.getFilters();
      expect(filters.text).toBe("login");
      expect(filters.statusFilter).toEqual(["active"]);
      expect(filters.tagsFilter).toBeNull();
    });

    it("resetFilters restores defaults", () => {
      slice.setFilters({
        text: "something",
        statusFilter: ["error"],
        tagsFilter: ["bug"],
      });
      slice.resetFilters();

      const filters = slice.getFilters();
      expect(filters.text).toBe("");
      expect(filters.statusFilter).toBeNull();
      expect(filters.tagsFilter).toBeNull();
    });

    it("getFilters returns a copy, not a reference", () => {
      const f1 = slice.getFilters();
      f1.text = "mutated";
      expect(slice.getFilters().text).toBe("");
    });
  });

  // ── Sidebar ───────────────────────────────────────

  describe("sidebar", () => {
    it("toggleSidebar closes when open", () => {
      expect(slice.getSidebarOpen()).toBe(true);
      slice.toggleSidebar();
      expect(slice.getSidebarOpen()).toBe(false);
    });

    it("toggleSidebar opens when closed", () => {
      slice.toggleSidebar(); // close
      slice.toggleSidebar(); // open
      expect(slice.getSidebarOpen()).toBe(true);
    });

    it("setSidebarWidth clamps to minimum", () => {
      slice.setSidebarWidth(50);
      expect(slice.getSidebarWidth()).toBe(200);
    });

    it("setSidebarWidth clamps to maximum", () => {
      slice.setSidebarWidth(9999);
      expect(slice.getSidebarWidth()).toBe(480);
    });

    it("setSidebarWidth accepts valid values", () => {
      slice.setSidebarWidth(320);
      expect(slice.getSidebarWidth()).toBe(320);
    });

    it("setSidebarMode changes mode", () => {
      slice.setSidebarMode("overlay");
      expect(slice.getSidebarMode()).toBe("overlay");
    });
  });

  // ── Session Selection ─────────────────────────────

  describe("session selection", () => {
    it("selectSession sets active session id", () => {
      slice.selectSession("session-1");
      expect(slice.getActiveSessionId()).toBe("session-1");
    });

    it("deselectSession clears active session id", () => {
      slice.selectSession("session-1");
      slice.deselectSession();
      expect(slice.getActiveSessionId()).toBeNull();
    });

    it("selectSession replaces previous selection", () => {
      slice.selectSession("session-1");
      slice.selectSession("session-2");
      expect(slice.getActiveSessionId()).toBe("session-2");
    });
  });

  // ── refreshSessions ───────────────────────────────

  describe("refreshSessions", () => {
    it("loads sessions from DB", async () => {
      insertSession(db, "s1", { title: "First", updated_at: 300 });
      insertSession(db, "s2", { title: "Second", updated_at: 100 });
      insertSession(db, "s3", { title: "Third", updated_at: 200 });

      await slice.refreshSessions();

      const sessions = slice.getSessions();
      expect(sessions).toHaveLength(3);
      expect(sessions.map((s) => s.id)).toEqual(["s1", "s3", "s2"]);
    });

    it("returns empty array when no sessions in DB", async () => {
      await slice.refreshSessions();
      expect(slice.getSessions()).toEqual([]);
    });

    it("includes tags in loaded sessions", async () => {
      insertSession(db, "s1", { title: "Tagged" });
      insertTag(db, "s1", "typescript");
      insertTag(db, "s1", "backend");

      await slice.refreshSessions();

      const s = slice.getSessions()[0]!;
      expect(s.tags).toEqual(expect.arrayContaining(["typescript", "backend"]));
    });

    it("replaces previous sessions on refresh", async () => {
      insertSession(db, "s1", { title: "First" });
      await slice.refreshSessions();
      expect(slice.getSessions()).toHaveLength(1);

      insertSession(db, "s2", { title: "Second" });
      await slice.refreshSessions();
      expect(slice.getSessions()).toHaveLength(2);
    });
  });

  // ── updateTags ────────────────────────────────────

  describe("updateTags", () => {
    it("adds new tags to a session", async () => {
      insertSession(db, "s1", { title: "Test" });
      await slice.refreshSessions();

      await slice.updateTags("s1", ["important", "backend"]);

      const s = slice.getSessions()[0]!;
      expect(s.tags).toEqual(expect.arrayContaining(["important", "backend"]));

      // Verify DB persistence
      const dbTags = db
        .prepare("SELECT tag FROM session_tags WHERE session_id = ?")
        .all("s1") as Array<{ tag: string }>;
      expect(dbTags.map((t) => t.tag).sort()).toEqual(
        ["backend", "important"].sort(),
      );
    });

    it("removes tags not in the new list", async () => {
      insertSession(db, "s1", { title: "Test" });
      insertTag(db, "s1", "old-tag");
      insertTag(db, "s1", "keep-tag");
      await slice.refreshSessions();

      await slice.updateTags("s1", ["keep-tag"]);

      const s = slice.getSessions()[0]!;
      expect(s.tags).toEqual(["keep-tag"]);

      const dbTags = db
        .prepare("SELECT tag FROM session_tags WHERE session_id = ?")
        .all("s1") as Array<{ tag: string }>;
      expect(dbTags).toHaveLength(1);
      expect(dbTags[0]!.tag).toBe("keep-tag");
    });

    it("is a no-op for non-existent session", async () => {
      await expect(
        slice.updateTags("ghost", ["tag"]),
      ).resolves.not.toThrow();
    });
  });

  // ── updateTitle ───────────────────────────────────

  describe("updateTitle", () => {
    it("updates session title in state", async () => {
      insertSession(db, "s1", { title: "Old Title" });
      await slice.refreshSessions();

      await slice.updateTitle("s1", "New Title");

      const s = slice.getSessions()[0]!;
      expect(s.title).toBe("New Title");
    });

    it("persists title to DB", async () => {
      insertSession(db, "s1", { title: "Old Title" });
      await slice.refreshSessions();

      await slice.updateTitle("s1", "New Title");

      const row = db
        .prepare("SELECT title FROM sessions WHERE id = ?")
        .get("s1") as { title: string };
      expect(row.title).toBe("New Title");
    });

    it("does not throw for non-existent session", async () => {
      await expect(
        slice.updateTitle("ghost", "Title"),
      ).resolves.not.toThrow();
    });
  });

  // ── Integration: full flow ────────────────────────

  describe("integration flow", () => {
    it("refresh → select → filter → reset flow", async () => {
      insertSession(db, "s1", {
        title: "Auth Bug",
        status: "completed",
        updated_at: 300,
      });
      insertSession(db, "s2", {
        title: "Refactor",
        status: "active",
        updated_at: 100,
      });

      await slice.refreshSessions();
      expect(slice.getSessions()).toHaveLength(2);

      slice.selectSession("s1");
      expect(slice.getActiveSessionId()).toBe("s1");

      slice.setFilters({ statusFilter: ["completed"] });
      expect(slice.getFilters().statusFilter).toEqual(["completed"]);

      slice.resetFilters();
      expect(slice.getFilters().statusFilter).toBeNull();
    });
  });
});
