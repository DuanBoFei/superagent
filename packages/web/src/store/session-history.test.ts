import { describe, it, expect, beforeEach } from "vitest";
import {
  useSessionHistoryStore,
  selectSortedSessions,
  selectFilteredSessions,
} from "./session-history";
import type { SessionSummary, SearchQuery } from "../types/session-history";

function makeSession(overrides?: Partial<SessionSummary>): SessionSummary {
  return {
    id: "s1",
    title: "Fix auth bug",
    firstMessagePreview: "Can you help me fix...",
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:05:00.000Z",
    messageCount: 10,
    ...overrides,
  };
}

beforeEach(() => {
  useSessionHistoryStore.getState().reset();
});

describe("SessionHistoryStore", () => {
  describe("initial state", () => {
    it("has empty sessions", () => {
      expect(useSessionHistoryStore.getState().sessions).toEqual([]);
    });

    it("has null activeSessionId", () => {
      expect(useSessionHistoryStore.getState().activeSessionId).toBeNull();
    });

    it("has default search query", () => {
      const q = useSessionHistoryStore.getState().searchQuery;
      expect(q.text).toBe("");
      expect(q.dateRange).toBeNull();
    });

    it("has sidebar open by default", () => {
      expect(useSessionHistoryStore.getState().sidebarOpen).toBe(true);
    });

    it("has default sidebar width", () => {
      expect(useSessionHistoryStore.getState().sidebarWidth).toBe(360);
    });

    it("is not loading", () => {
      expect(useSessionHistoryStore.getState().isLoading).toBe(false);
    });

    it("has no error", () => {
      expect(useSessionHistoryStore.getState().error).toBeNull();
    });
  });

  describe("setSessions", () => {
    it("sets sessions array", () => {
      const sessions = [makeSession(), makeSession({ id: "s2" })];
      useSessionHistoryStore.getState().setSessions(sessions);
      expect(useSessionHistoryStore.getState().sessions).toEqual(sessions);
    });
  });

  describe("selectSession / deselectSession", () => {
    it("selects a session by id", () => {
      useSessionHistoryStore.getState().selectSession("abc");
      expect(useSessionHistoryStore.getState().activeSessionId).toBe("abc");
    });

    it("deselects to null", () => {
      useSessionHistoryStore.getState().selectSession("abc");
      useSessionHistoryStore.getState().deselectSession();
      expect(useSessionHistoryStore.getState().activeSessionId).toBeNull();
    });
  });

  describe("setSearchQuery", () => {
    it("merges partial updates", () => {
      useSessionHistoryStore.getState().setSearchQuery({ text: "bug" });
      const q = useSessionHistoryStore.getState().searchQuery;
      expect(q.text).toBe("bug");
      expect(q.dateRange).toBeNull();
    });

    it("merges multiple partials", () => {
      useSessionHistoryStore.getState().setSearchQuery({ text: "fix" });
      useSessionHistoryStore.getState().setSearchQuery({ dateRange: { start: 1700000000000, end: 1700000001000 } });
      const q = useSessionHistoryStore.getState().searchQuery;
      expect(q.text).toBe("fix");
      expect(q.dateRange).toEqual({ start: 1700000000000, end: 1700000001000 });
    });
  });

  describe("resetSearchQuery", () => {
    it("resets to defaults", () => {
      useSessionHistoryStore.getState().setSearchQuery({
        text: "test",
        dateRange: { start: 1, end: 2 },
      });
      useSessionHistoryStore.getState().resetSearchQuery();
      const q = useSessionHistoryStore.getState().searchQuery;
      expect(q.text).toBe("");
      expect(q.dateRange).toBeNull();
    });
  });

  describe("toggleSidebar / setSidebarOpen", () => {
    it("toggles sidebar state", () => {
      expect(useSessionHistoryStore.getState().sidebarOpen).toBe(true);
      useSessionHistoryStore.getState().toggleSidebar();
      expect(useSessionHistoryStore.getState().sidebarOpen).toBe(false);
      useSessionHistoryStore.getState().toggleSidebar();
      expect(useSessionHistoryStore.getState().sidebarOpen).toBe(true);
    });

    it("sets sidebar open explicitly", () => {
      useSessionHistoryStore.getState().setSidebarOpen(false);
      expect(useSessionHistoryStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe("setSidebarWidth", () => {
    it("sets width within bounds", () => {
      useSessionHistoryStore.getState().setSidebarWidth(400);
      expect(useSessionHistoryStore.getState().sidebarWidth).toBe(400);
    });

    it("clamps to minimum 280", () => {
      useSessionHistoryStore.getState().setSidebarWidth(200);
      expect(useSessionHistoryStore.getState().sidebarWidth).toBe(280);
    });

    it("clamps to maximum 600", () => {
      useSessionHistoryStore.getState().setSidebarWidth(800);
      expect(useSessionHistoryStore.getState().sidebarWidth).toBe(600);
    });

    it("rounds fractional widths", () => {
      useSessionHistoryStore.getState().setSidebarWidth(400.7);
      expect(useSessionHistoryStore.getState().sidebarWidth).toBe(401);
    });
  });

  describe("updateSessionTitle", () => {
    it("updates title of matching session", () => {
      useSessionHistoryStore.getState().setSessions([
        makeSession({ id: "s1", title: "Old" }),
        makeSession({ id: "s2", title: "Keep" }),
      ]);
      useSessionHistoryStore.getState().updateSessionTitle("s1", "New Title");
      const sessions = useSessionHistoryStore.getState().sessions;
      expect(sessions[0].title).toBe("New Title");
      expect(sessions[1].title).toBe("Keep");
    });
  });

  describe("addOrUpdateSession", () => {
    it("adds new session at front", () => {
      useSessionHistoryStore.getState().addOrUpdateSession(makeSession({ id: "s1" }));
      expect(useSessionHistoryStore.getState().sessions).toHaveLength(1);
      expect(useSessionHistoryStore.getState().sessions[0].id).toBe("s1");
    });

    it("updates existing session in place", () => {
      useSessionHistoryStore.getState().addOrUpdateSession(makeSession({ id: "s1", title: "Old" }));
      useSessionHistoryStore.getState().addOrUpdateSession(makeSession({ id: "s1", title: "New" }));
      expect(useSessionHistoryStore.getState().sessions).toHaveLength(1);
      expect(useSessionHistoryStore.getState().sessions[0].title).toBe("New");
    });
  });

  describe("removeSession", () => {
    it("removes session by id", () => {
      useSessionHistoryStore.getState().setSessions([
        makeSession({ id: "s1" }),
        makeSession({ id: "s2" }),
      ]);
      useSessionHistoryStore.getState().removeSession("s1");
      expect(useSessionHistoryStore.getState().sessions).toHaveLength(1);
      expect(useSessionHistoryStore.getState().sessions[0].id).toBe("s2");
    });

    it("clears activeSessionId if it was the removed session", () => {
      useSessionHistoryStore.getState().setSessions([makeSession({ id: "selected" })]);
      useSessionHistoryStore.getState().selectSession("selected");
      useSessionHistoryStore.getState().removeSession("selected");
      expect(useSessionHistoryStore.getState().activeSessionId).toBeNull();
    });
  });

  describe("setLoading / setError", () => {
    it("sets loading state", () => {
      useSessionHistoryStore.getState().setLoading(true);
      expect(useSessionHistoryStore.getState().isLoading).toBe(true);
    });

    it("sets and clears error", () => {
      useSessionHistoryStore.getState().setError("something went wrong");
      expect(useSessionHistoryStore.getState().error).toBe("something went wrong");
      useSessionHistoryStore.getState().setError(null);
      expect(useSessionHistoryStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("restores initial state", () => {
      useSessionHistoryStore.getState().setSessions([makeSession()]);
      useSessionHistoryStore.getState().selectSession("s1");
      useSessionHistoryStore.getState().setSearchQuery({ text: "test" });
      useSessionHistoryStore.getState().setSidebarOpen(false);
      useSessionHistoryStore.getState().setSidebarWidth(500);
      useSessionHistoryStore.getState().setLoading(true);
      useSessionHistoryStore.getState().setError("err");
      useSessionHistoryStore.getState().reset();

      const s = useSessionHistoryStore.getState();
      expect(s.sessions).toEqual([]);
      expect(s.activeSessionId).toBeNull();
      expect(s.searchQuery.text).toBe("");
      expect(s.sidebarOpen).toBe(true);
      expect(s.sidebarWidth).toBe(360);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });
  });
});

describe("selectSortedSessions", () => {
  it("sorts by updatedAt descending (ISO strings)", () => {
    const sessions = [
      makeSession({ id: "a", updatedAt: "2026-06-19T10:00:00.000Z" }),
      makeSession({ id: "b", updatedAt: "2026-06-21T10:00:00.000Z" }),
      makeSession({ id: "c", updatedAt: "2026-06-20T10:00:00.000Z" }),
    ];
    const sorted = selectSortedSessions(sessions);
    expect(sorted.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate input", () => {
    const sessions = [makeSession({ id: "a", updatedAt: "2026-06-20T10:00:00.000Z" })];
    const copy = [...sessions];
    selectSortedSessions(sessions);
    expect(sessions).toEqual(copy);
  });
});

describe("selectFilteredSessions", () => {
  const baseQuery: SearchQuery = {
    text: "",
    dateRange: null,
  };

  it("filters by text in title", () => {
    const sessions = [
      makeSession({ id: "1", title: "Fix auth bug", firstMessagePreview: "" }),
      makeSession({ id: "2", title: "Add feature", firstMessagePreview: "" }),
    ];
    const result = selectFilteredSessions(sessions, {
      ...baseQuery,
      text: "auth",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by text in preview", () => {
    const sessions = [
      makeSession({
        id: "1",
        title: "Session",
        firstMessagePreview: "Please fix authentication",
      }),
      makeSession({
        id: "2",
        title: "Other",
        firstMessagePreview: "Add new endpoint",
      }),
    ];
    const result = selectFilteredSessions(sessions, {
      ...baseQuery,
      text: "auth",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("is case insensitive", () => {
    const sessions = [makeSession({ id: "1", title: "FIX BUG" })];
    const result = selectFilteredSessions(sessions, {
      ...baseQuery,
      text: "fix",
    });
    expect(result).toHaveLength(1);
  });

  it("filters by date range", () => {
    const sessions = [
      makeSession({ id: "old", createdAt: "2026-06-01T00:00:00.000Z" }),
      makeSession({ id: "mid", createdAt: "2026-06-15T00:00:00.000Z" }),
      makeSession({ id: "new", createdAt: "2026-06-21T00:00:00.000Z" }),
    ];
    const result = selectFilteredSessions(sessions, {
      ...baseQuery,
      dateRange: {
        start: new Date("2026-06-10").getTime(),
        end: new Date("2026-06-18").getTime(),
      },
    });
    expect(result.map((s) => s.id)).toEqual(["mid"]);
  });

  it("returns all when no filters active", () => {
    const sessions = [
      makeSession({ id: "1" }),
      makeSession({ id: "2" }),
    ];
    const result = selectFilteredSessions(sessions, baseQuery);
    expect(result).toHaveLength(2);
  });

  it("returns empty when no match", () => {
    const result = selectFilteredSessions([makeSession()], {
      ...baseQuery,
      text: "zzznotfound",
    });
    expect(result).toEqual([]);
  });
});
