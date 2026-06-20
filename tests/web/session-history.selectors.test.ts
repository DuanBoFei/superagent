import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../../src/persistence/store";
import { SessionDbService } from "../../packages/web/src/services/session-db.service";
import {
  selectSortedSessions,
  filterSessionsLocally,
  selectFilteredSessions,
  selectActiveSession,
  selectSessionTags,
  selectStats,
} from "../../packages/web/src/store/slices/session-history.selectors";
import type { SessionSummary, SearchQuery } from "../../packages/web/src/types/session-history";

function makeSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: "s1",
    title: "",
    firstMessagePreview: "",
    createdAt: 1000,
    updatedAt: 2000,
    durationMs: 0,
    toolCallCount: 0,
    messageCount: 0,
    status: "active",
    tags: [],
    forkedFrom: null,
    ...overrides,
  };
}

const DEFAULT_QUERY: SearchQuery = {
  text: "",
  dateRange: null,
  statusFilter: null,
  tagsFilter: null,
};

describe("SessionHistory Selectors", () => {
  // ── selectSortedSessions ───────────────────────────

  describe("selectSortedSessions", () => {
    it("returns empty array for empty input", () => {
      expect(selectSortedSessions([])).toEqual([]);
    });

    it("sorts by updatedAt descending", () => {
      const sessions = [
        makeSummary({ id: "a", updatedAt: 100 }),
        makeSummary({ id: "b", updatedAt: 300 }),
        makeSummary({ id: "c", updatedAt: 200 }),
      ];

      const result = selectSortedSessions(sessions);
      expect(result.map((s) => s.id)).toEqual(["b", "c", "a"]);
    });

    it("does not mutate input array", () => {
      const sessions = [
        makeSummary({ id: "a", updatedAt: 100 }),
        makeSummary({ id: "b", updatedAt: 300 }),
      ];
      const original = [...sessions];

      selectSortedSessions(sessions);
      expect(sessions).toEqual(original);
    });

    it("returns new array (not reference)", () => {
      const sessions = [makeSummary()];
      const result = selectSortedSessions(sessions);
      expect(result).not.toBe(sessions);
    });
  });

  // ── filterSessionsLocally ──────────────────────────

  describe("filterSessionsLocally", () => {
    const sessions = [
      makeSummary({ id: "a", status: "active", createdAt: 1000, tags: ["frontend"] }),
      makeSummary({ id: "b", status: "completed", createdAt: 2000, tags: ["backend"] }),
      makeSummary({ id: "c", status: "error", createdAt: 3000, tags: ["frontend", "bugfix"] }),
    ];

    it("returns all sessions for empty query", () => {
      const result = filterSessionsLocally(sessions, DEFAULT_QUERY);
      expect(result).toHaveLength(3);
    });

    it("filters by status", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        statusFilter: ["completed", "error"],
      });
      expect(result.map((s) => s.id).sort()).toEqual(["b", "c"]);
    });

    it("filters by date range", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        dateRange: { start: 1500, end: 2500 },
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("b");
    });

    it("filters by tags", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        tagsFilter: ["frontend"],
      });
      expect(result.map((s) => s.id).sort()).toEqual(["a", "c"]);
    });

    it("combines multiple filters", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        statusFilter: ["active", "error"],
        tagsFilter: ["bugfix"],
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("c");
    });

    it("returns empty when no matches", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        statusFilter: ["completed"],
        tagsFilter: ["bugfix"],
      });
      expect(result).toEqual([]);
    });

    // Edge cases for date range
    it("filters with only start date", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        dateRange: { start: 2500, end: 99999 },
      });
      expect(result.map((s) => s.id)).toEqual(["c"]);
    });

    it("filters with only end date", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        dateRange: { start: 0, end: 1500 },
      });
      expect(result.map((s) => s.id)).toEqual(["a"]);
    });

    it("empty status filter array returns all", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        statusFilter: [],
      });
      expect(result).toHaveLength(3);
    });

    it("empty tags filter array returns all", () => {
      const result = filterSessionsLocally(sessions, {
        ...DEFAULT_QUERY,
        tagsFilter: [],
      });
      expect(result).toHaveLength(3);
    });
  });

  // ── selectFilteredSessions (with DB) ───────────────

  describe("selectFilteredSessions", () => {
    let db: Database.Database;
    let svc: SessionDbService;

    beforeEach(() => {
      db = initDb(":memory:");
      svc = new SessionDbService(db);
    });

    afterEach(() => {
      db.close();
    });

    function insert(id: string, overrides: Record<string, unknown> = {}) {
      db.prepare(
        `INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json, title, status, duration_ms, tool_call_count, message_count, messages_content, forked_from, forked_at_message_index)
         VALUES (@id, @created_at, @updated_at, @turn_count, @first_message, @state_json, @title, @status, @duration_ms, @tool_call_count, @message_count, @messages_content, @forked_from, @forked_at_message_index)`,
      ).run({
        id,
        created_at: 1000,
        updated_at: 2000,
        turn_count: 1,
        first_message: "hello",
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

    it("filters locally when text query is empty", async () => {
      insert("s1", { status: "active" });
      insert("s2", { status: "completed" });

      const inMemory = await svc.getSessionSummaries();
      const result = await selectFilteredSessions(svc, inMemory, {
        ...DEFAULT_QUERY,
        statusFilter: ["completed"],
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("s2");
    });

    it("delegates to DB FTS5 when text query is non-empty", async () => {
      insert("s1", {
        title: "Auth Bug",
        messages_content: "fix login authentication",
      });
      insert("s2", {
        title: "Refactor",
        messages_content: "rename variables",
      });

      const inMemory = await svc.getSessionSummaries();
      const result = await selectFilteredSessions(svc, inMemory, {
        ...DEFAULT_QUERY,
        text: "authentication",
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("s1");
    });

    it("returns empty when FTS5 has no matches", async () => {
      insert("s1", { title: "Auth", messages_content: "auth stuff" });

      const inMemory = await svc.getSessionSummaries();
      const result = await selectFilteredSessions(svc, inMemory, {
        ...DEFAULT_QUERY,
        text: "nonexistent",
      });

      expect(result).toEqual([]);
    });
  });

  // ── selectActiveSession ────────────────────────────

  describe("selectActiveSession", () => {
    let db: Database.Database;
    let svc: SessionDbService;

    beforeEach(() => {
      db = initDb(":memory:");
      svc = new SessionDbService(db);
    });

    afterEach(() => {
      db.close();
    });

    it("returns null when sessionId is null", async () => {
      const result = await selectActiveSession(svc, null);
      expect(result).toBeNull();
    });

    it("returns null for non-existent session", async () => {
      const result = await selectActiveSession(svc, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns full session data", async () => {
      db.prepare(
        `INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json, title, status, duration_ms, tool_call_count, message_count, messages_content, forked_from, forked_at_message_index)
         VALUES ('s1', 1000, 2000, 3, 'Fix bug', '{}', 'My Session', 'completed', 5000, 5, 10, '', NULL, NULL)`,
      ).run();

      const result = await selectActiveSession(svc, "s1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("s1");
      expect(result!.title).toBe("My Session");
      expect(result!.status).toBe("completed");
    });
  });

  // ── selectSessionTags ──────────────────────────────

  describe("selectSessionTags", () => {
    it("returns empty array for empty sessions", () => {
      expect(selectSessionTags([])).toEqual([]);
    });

    it("returns unique sorted tags across all sessions", () => {
      const sessions = [
        makeSummary({ tags: ["backend", "typescript"] }),
        makeSummary({ tags: ["frontend", "typescript"] }),
        makeSummary({ tags: [] }),
      ];

      const result = selectSessionTags(sessions);
      expect(result).toEqual(["backend", "frontend", "typescript"]);
    });

    it("returns empty array when no sessions have tags", () => {
      const sessions = [
        makeSummary({ tags: [] }),
        makeSummary({ tags: [] }),
      ];

      expect(selectSessionTags(sessions)).toEqual([]);
    });

    it("handles single session", () => {
      const sessions = [makeSummary({ tags: ["important"] })];
      expect(selectSessionTags(sessions)).toEqual(["important"]);
    });
  });

  // ── selectStats ────────────────────────────────────

  describe("selectStats", () => {
    it("returns zeros for empty sessions", () => {
      const stats = selectStats([]);
      expect(stats).toEqual({
        total: 0,
        active: 0,
        completed: 0,
        error: 0,
      });
    });

    it("counts sessions by status", () => {
      const sessions = [
        makeSummary({ status: "active" }),
        makeSummary({ status: "active" }),
        makeSummary({ status: "completed" }),
        makeSummary({ status: "completed" }),
        makeSummary({ status: "completed" }),
        makeSummary({ status: "error" }),
      ];

      const stats = selectStats(sessions);
      expect(stats.total).toBe(6);
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(3);
      expect(stats.error).toBe(1);
    });

    it("total equals sum of status counts", () => {
      const sessions = [
        makeSummary({ status: "active" }),
        makeSummary({ status: "completed" }),
        makeSummary({ status: "error" }),
      ];

      const stats = selectStats(sessions);
      expect(stats.total).toBe(
        stats.active + stats.completed + stats.error,
      );
    });

    it("handles sessions with same status", () => {
      const sessions = [
        makeSummary({ status: "active" }),
        makeSummary({ status: "active" }),
        makeSummary({ status: "active" }),
      ];

      const stats = selectStats(sessions);
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(3);
      expect(stats.completed).toBe(0);
      expect(stats.error).toBe(0);
    });
  });
});
