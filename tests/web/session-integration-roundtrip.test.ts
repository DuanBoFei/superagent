import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../../src/persistence/store";
import { SessionDbService } from "../../packages/web/src/services/session-db.service";
import {
  buildExportPayload,
  validateImportPayload,
  resolveImportCollisions,
  createExportBlob,
} from "../../packages/web/src/components/sidebar/SessionExportImport";
import { forkSession } from "../../packages/web/src/components/sidebar/SessionForkDialog";
import type {
  SessionSummary,
  Session,
  SessionStatus,
  ExportFormatV1,
} from "../../packages/web/src/types/session-history";
import type { Message } from "../../packages/web/src/types/message";

// ── Helpers ───────────────────────────────────────────────

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello, agent!",
    timestamp: 1700000000000,
    status: "sent",
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-001",
    title: "Test Session",
    createdAt: 1700000000000,
    updatedAt: 1700000100000,
    durationMs: 5000,
    toolCallCount: 2,
    messageCount: 5,
    status: "completed" as SessionStatus,
    tags: ["bugfix"],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [makeMessage()],
    toolCalls: [],
    ...overrides,
  };
}

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

function insertFtsEntry(
  db: Database.Database,
  sessionId: string,
  content: string,
) {
  // The FTS5 triggers auto-sync on INSERT, but for in-memory DB tests
  // we sometimes need explicit inserts when testing search directly.
  // The trigger will fire on the INSERT above; this is for explicit control.
  const existing = db
    .prepare("SELECT session_id FROM sessions_fts WHERE session_id = ?")
    .get(sessionId);
  if (!existing) {
    db.prepare(
      "INSERT INTO sessions_fts (session_id, title, messages_content) VALUES (?, ?, ?)",
    ).run(sessionId, content, content);
  }
}

// ───────────────────────────────────────────────────────────
// T022 · Integration Roundtrip Tests
// ───────────────────────────────────────────────────────────

describe("T022 Integration: Export → Import Roundtrip", () => {
  let db: Database.Database;
  let svc: SessionDbService;

  beforeEach(() => {
    db = initDb(":memory:");
    svc = new SessionDbService(db);
  });

  afterEach(() => {
    db.close();
  });

  it("full roundtrip: export sessions → import blob → parse → verify integrity", async () => {
    // 1. Create sessions with rich data in DB
    insertSession(db, "orig-1", {
      title: "Fix login bug",
      status: "completed",
      duration_ms: 120000,
      tool_call_count: 8,
      message_count: 24,
      created_at: 1700000000000,
      updated_at: 1700000100000,
      first_message: "The login page returns 500 after token refresh",
      messages_content: "login token refresh 500 error authentication",
    });
    insertTag(db, "orig-1", "bugfix");
    insertTag(db, "orig-1", "auth");

    insertSession(db, "orig-2", {
      title: "Add rate limiting",
      status: "active",
      duration_ms: 30000,
      tool_call_count: 3,
      message_count: 10,
      created_at: 1700000200000,
      updated_at: 1700000300000,
      first_message: "Add rate limiting to API endpoints",
      messages_content: "rate limiting api middleware express",
    });
    insertTag(db, "orig-2", "feature");
    insertTag(db, "orig-2", "backend");

    insertSession(db, "orig-3", {
      title: "Refactor database layer",
      status: "error",
      duration_ms: 5000,
      tool_call_count: 6,
      message_count: 15,
      created_at: 1700000400000,
      updated_at: 1700000500000,
      first_message: "Refactor the database access layer",
      messages_content: "database refactor orm migration prisma",
    });
    // No tags for orig-3 (untagged session)

    // 2. Fetch sessions as full Session objects
    const session1 = await svc.getSession("orig-1");
    const session2 = await svc.getSession("orig-2");
    const session3 = await svc.getSession("orig-3");
    expect(session1).not.toBeNull();
    expect(session2).not.toBeNull();
    expect(session3).not.toBeNull();

    const sessions = [session1!, session2!, session3!];

    // 3. Build export payload
    const payload = buildExportPayload(sessions, "test-user");
    expect(payload.version).toBe(1);
    expect(payload.exportedBy).toBe("test-user");
    expect(payload.sessions).toHaveLength(3);

    // 4. Serialize to blob
    const blob = createExportBlob(payload);
    expect(blob.type).toBe("application/json");

    // 5. Parse blob back (simulating file read on import)
    const text = await blob.text();
    const parsed = JSON.parse(text) as unknown;

    // 6. Validate the imported payload
    expect(validateImportPayload(parsed)).toBe(true);
    const imported = parsed as ExportFormatV1;

    // 7. Resolve collisions (new IDs)
    const resolved = resolveImportCollisions(imported.sessions);
    expect(resolved).toHaveLength(3);

    // 8. Verify all IDs changed
    const origIds = new Set(sessions.map((s) => s.id));
    for (const r of resolved) {
      expect(origIds.has(r.id)).toBe(false);
    }

    // 9. Verify forkedFrom cleared
    for (const r of resolved) {
      expect(r.forkedFrom).toBeNull();
    }

    // 10. Verify all other fields preserved
    const titles = resolved.map((r) => r.title).sort();
    expect(titles).toEqual(
      ["Add rate limiting", "Fix login bug", "Refactor database layer"].sort(),
    );

    const statuses = resolved.map((r) => r.status).sort();
    expect(statuses).toEqual(["active", "completed", "error"].sort());

    // Tags preserved
    const tags1 = resolved.find((r) => r.title === "Fix login bug")!.tags;
    expect(tags1).toEqual(expect.arrayContaining(["bugfix", "auth"]));

    const tags3 = resolved.find(
      (r) => r.title === "Refactor database layer",
    )!.tags;
    expect(tags3).toEqual([]);

    // Numeric fields
    const loginFix = resolved.find((r) => r.title === "Fix login bug")!;
    expect(loginFix.durationMs).toBe(120000);
    expect(loginFix.toolCallCount).toBe(8);
    expect(loginFix.messageCount).toBe(24);
  });

  it("roundtrip preserves messages array content", async () => {
    insertSession(db, "orig-1", {
      title: "Message test",
      first_message: "First message content",
      messages_content: "full conversation content here",
    });

    const session = await svc.getSession("orig-1");
    expect(session).not.toBeNull();

    const payload = buildExportPayload([session!], "user");
    const blob = createExportBlob(payload);
    const text = await blob.text();
    const parsed = JSON.parse(text) as ExportFormatV1;

    const resolved = resolveImportCollisions(parsed.sessions);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.messages).toEqual(session!.messages);
  });

  it("roundtrip with empty sessions array", async () => {
    const payload = buildExportPayload([], "user");
    const blob = createExportBlob(payload);
    const text = await blob.text();
    const parsed = JSON.parse(text) as unknown;

    expect(validateImportPayload(parsed)).toBe(true);
    const imported = parsed as ExportFormatV1;
    expect(imported.sessions).toHaveLength(0);

    const resolved = resolveImportCollisions(imported.sessions);
    expect(resolved).toHaveLength(0);
  });

  it("roundtrip with forkedFrom sessions clears the reference", async () => {
    insertSession(db, "parent", {
      title: "Parent session",
      messages_content: "parent",
    });
    insertSession(db, "child", {
      title: "Child session",
      forked_from: "parent",
      forked_at_message_index: 3,
      messages_content: "child",
    });

    const child = await svc.getSession("child");
    expect(child).not.toBeNull();
    expect(child!.forkedFrom).toBe("parent");

    const payload = buildExportPayload([child!], "user");
    const blob = createExportBlob(payload);
    const text = await blob.text();
    const parsed = JSON.parse(text) as ExportFormatV1;

    const resolved = resolveImportCollisions(parsed.sessions);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.forkedFrom).toBeNull();
  });

  it("imported sessions can be inserted back into DB", async () => {
    insertSession(db, "orig-1", {
      title: "DB roundtrip",
      messages_content: "test content",
    });
    insertTag(db, "orig-1", "alpha");

    const session = await svc.getSession("orig-1");
    const payload = buildExportPayload([session!], "user");
    const blob = createExportBlob(payload);
    const text = await blob.text();
    const parsed = JSON.parse(text) as ExportFormatV1;
    const resolved = resolveImportCollisions(parsed.sessions);

    // Insert the imported session back
    const imported = resolved[0]!;
    insertSession(db, imported.id, {
      title: imported.title,
      status: imported.status,
      duration_ms: imported.durationMs,
      tool_call_count: imported.toolCallCount,
      message_count: imported.messageCount,
      created_at: imported.createdAt,
      updated_at: imported.updatedAt,
      first_message: imported.messages[0]?.content ?? "",
      messages_content: "",
      forked_from: imported.forkedFrom,
      forked_at_message_index: imported.forkedAtMessageIndex,
    });

    // Verify via DB
    const fetched = await svc.getSession(imported.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe("DB roundtrip");
    expect(fetched!.forkedFrom).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────
// T022 · 100-Session FTS5 Search at Scale
// ───────────────────────────────────────────────────────────

describe("T022 Integration: 100-Session FTS5 Search", () => {
  let db: Database.Database;
  let svc: SessionDbService;

  beforeEach(() => {
    db = initDb(":memory:");
    svc = new SessionDbService(db);
  });

  afterEach(() => {
    db.close();
  });

  it("inserts 100 sessions and searches via FTS5", async () => {
    const topics = [
      "authentication",
      "database",
      "frontend",
      "api",
      "testing",
      "deployment",
      "logging",
      "performance",
      "security",
      "refactoring",
    ];

    for (let i = 0; i < 100; i++) {
      const topic = topics[i % topics.length];
      const id = `s${String(i).padStart(3, "0")}`;
      insertSession(db, id, {
        title: `${topic} task ${i}`,
        updated_at: i * 100,
        first_message: `Work on ${topic} improvement #${i}`,
        messages_content: `${topic} fix bug report issue ${i} enhance implement refactor`,
      });
      // The FTS5 trigger should auto-populate sessions_fts
    }

    // Verify all 100 sessions exist
    const count = db.prepare("SELECT COUNT(*) as c FROM sessions").get() as {
      c: number;
    };
    expect(count.c).toBe(100);

    // Search for "authentication" — should match ~10 sessions
    const authResults = await svc.searchSessions(
      { text: "authentication", dateRange: null, statusFilter: null, tagsFilter: null },
      { limit: 20, offset: 0 },
    );
    expect(authResults.length).toBeGreaterThanOrEqual(10);
    expect(authResults.length).toBeLessThanOrEqual(10);
    for (const r of authResults) {
      expect(r.title).toContain("authentication");
    }

    // Search for "deployment" with pagination
    const page1 = await svc.searchSessions(
      { text: "deployment", dateRange: null, statusFilter: null, tagsFilter: null },
      { limit: 5, offset: 0 },
    );
    const page2 = await svc.searchSessions(
      { text: "deployment", dateRange: null, statusFilter: null, tagsFilter: null },
      { limit: 5, offset: 5 },
    );

    expect(page1).toHaveLength(5);
    expect(page2).toHaveLength(5);
    // No overlap
    const page1Ids = new Set(page1.map((s) => s.id));
    const overlap = page2.some((s) => page1Ids.has(s.id));
    expect(overlap).toBe(false);
  });

  it("search with combined filters at 100-session scale", async () => {
    for (let i = 0; i < 100; i++) {
      const id = `s${String(i).padStart(3, "0")}`;
      const status = i < 30 ? "active" : i < 70 ? "completed" : "error";
      insertSession(db, id, {
        title: `Session ${i}`,
        created_at: 1000 + i * 100,
        updated_at: i * 100,
        status,
        messages_content: `content for session ${i} searchable term`,
      });
    }

    // Search with status filter
    const activeResults = await svc.searchSessions(
      {
        text: "searchable",
        dateRange: null,
        statusFilter: ["active"],
        tagsFilter: null,
      },
      { limit: 50, offset: 0 },
    );
    expect(activeResults.length).toBe(30);
    for (const r of activeResults) {
      expect(r.status).toBe("active");
    }

    // Search with date range (filters on created_at)
    // created_at ranges from 1000 to 10900; start=0, end=6000 covers 1000–6000 → 51 sessions (i=0 to i=50)
    const dateResults = await svc.searchSessions(
      {
        text: "",
        dateRange: { start: 0, end: 6000 },
        statusFilter: null,
        tagsFilter: null,
      },
      { limit: 100, offset: 0 },
    );
    expect(dateResults.length).toBe(51);
  });

  it("search with tag filter at 100-session scale", async () => {
    for (let i = 0; i < 100; i++) {
      const id = `s${String(i).padStart(3, "0")}`;
      insertSession(db, id, {
        title: `Session ${i}`,
        updated_at: i * 100,
      });
      // Tag every 3rd session with "important"
      if (i % 3 === 0) {
        insertTag(db, id, "important");
      }
      // Tag every 5th session with "backend"
      if (i % 5 === 0) {
        insertTag(db, id, "backend");
      }
    }

    // Search by "important" tag
    const important = await svc.searchSessions(
      {
        text: "",
        dateRange: null,
        statusFilter: null,
        tagsFilter: ["important"],
      },
      { limit: 100, offset: 0 },
    );
    // Sessions 0, 3, 6, ..., 99 → 34 sessions
    expect(important.length).toBe(34);
    for (const r of important) {
      expect(r.tags).toContain("important");
    }

    // Search by "backend" tag
    const backend = await svc.searchSessions(
      {
        text: "",
        dateRange: null,
        statusFilter: null,
        tagsFilter: ["backend"],
      },
      { limit: 100, offset: 0 },
    );
    // Sessions 0, 5, 10, ..., 95 → 20 sessions
    expect(backend.length).toBe(20);
    for (const r of backend) {
      expect(r.tags).toContain("backend");
    }
  });

  it("search returns empty for non-matching query at scale", async () => {
    for (let i = 0; i < 100; i++) {
      insertSession(db, `s${String(i).padStart(3, "0")}`, {
        updated_at: i * 100,
        messages_content: `common content ${i}`,
      });
    }

    const results = await svc.searchSessions(
      { text: "xyznonexistent12345", dateRange: null, statusFilter: null, tagsFilter: null },
      { limit: 50, offset: 0 },
    );
    expect(results).toEqual([]);
  });

  it("search with large limit returns all matching sessions", async () => {
    for (let i = 0; i < 100; i++) {
      insertSession(db, `s${String(i).padStart(3, "0")}`, {
        updated_at: i * 100,
        messages_content: `universal keyword ${i}`,
      });
    }

    const results = await svc.searchSessions(
      { text: "universal", dateRange: null, statusFilter: null, tagsFilter: null },
      { limit: 200, offset: 0 },
    );
    expect(results.length).toBe(100);
  });

  it("search offset beyond results returns empty", async () => {
    for (let i = 0; i < 50; i++) {
      insertSession(db, `s${String(i).padStart(3, "0")}`, {
        updated_at: i * 100,
        messages_content: `limited keyword ${i}`,
      });
    }

    const results = await svc.searchSessions(
      { text: "limited", dateRange: null, statusFilter: null, tagsFilter: null },
      { limit: 20, offset: 100 },
    );
    expect(results).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────
// T022 · Fork e2e with DB Persistence
// ───────────────────────────────────────────────────────────

describe("T022 Integration: Fork End-to-End", () => {
  let db: Database.Database;
  let svc: SessionDbService;

  beforeEach(() => {
    db = initDb(":memory:");
    svc = new SessionDbService(db);
  });

  afterEach(() => {
    db.close();
  });

  it("fork session → insert into DB → verify parent relationship", async () => {
    // 1. Create source session in DB
    insertSession(db, "parent-1", {
      title: "Original session",
      status: "completed",
      duration_ms: 60000,
      tool_call_count: 5,
      message_count: 12,
      created_at: 1700000000000,
      updated_at: 1700000100000,
      first_message: "Original first message",
    });
    insertTag(db, "parent-1", "original");

    const source = await svc.getSession("parent-1");
    expect(source).not.toBeNull();

    // 2. Fork the session
    const forked = forkSession(source!, 3, "My forked session");
    expect(forked.id).not.toBe(source!.id);
    expect(forked.forkedFrom).toBe("parent-1");
    expect(forked.forkedAtMessageIndex).toBe(3);
    expect(forked.title).toBe("My forked session");
    expect(forked.status).toBe("active");

    // 3. Insert the forked session into DB
    insertSession(db, forked.id, {
      title: forked.title,
      status: forked.status,
      duration_ms: forked.durationMs,
      tool_call_count: forked.toolCallCount,
      message_count: forked.messageCount,
      created_at: forked.createdAt,
      updated_at: forked.updatedAt,
      first_message: forked.messages[0]?.content ?? "",
      messages_content: "",
      forked_from: forked.forkedFrom,
      forked_at_message_index: forked.forkedAtMessageIndex,
    });

    // Copy tags
    for (const tag of forked.tags) {
      insertTag(db, forked.id, tag);
    }

    // 4. Verify via DB
    const fetched = await svc.getSession(forked.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(forked.id);
    expect(fetched!.title).toBe("My forked session");
    expect(fetched!.forkedFrom).toBe("parent-1");
    expect(fetched!.forkedAtMessageIndex).toBe(3);
    expect(fetched!.status).toBe("active");
    expect(fetched!.tags).toEqual(["original"]);

    // 5. Verify parent still exists and is unchanged
    const parent = await svc.getSession("parent-1");
    expect(parent).not.toBeNull();
    expect(parent!.title).toBe("Original session");
    expect(parent!.status).toBe("completed");
  });

  it("fork session appears in session summaries alongside parent", async () => {
    insertSession(db, "parent-1", {
      title: "Parent session",
      updated_at: 1000,
      first_message: "Parent first message",
    });

    const source = await svc.getSession("parent-1");
    const forked = forkSession(source!, 0, "Child session");

    insertSession(db, forked.id, {
      title: forked.title,
      updated_at: forked.updatedAt,
      first_message: forked.messages[0]?.content ?? "",
      forked_from: forked.forkedFrom,
      forked_at_message_index: forked.forkedAtMessageIndex,
    });

    const summaries = await svc.getSessionSummaries();
    expect(summaries).toHaveLength(2);

    const childSummary = summaries.find((s) => s.id === forked.id);
    expect(childSummary).toBeDefined();
    expect(childSummary!.forkedFrom).toBe("parent-1");
  });

  it("fork of a fork creates a chain (grandparent → parent → child)", async () => {
    // Grandparent
    insertSession(db, "gp", {
      title: "Grandparent",
      first_message: "Start",
      updated_at: 1000,
    });

    const gp = await svc.getSession("gp");
    const parent = forkSession(gp!, 2, "Parent");

    insertSession(db, parent.id, {
      title: parent.title,
      updated_at: parent.updatedAt,
      first_message: parent.messages[0]?.content ?? "",
      forked_from: parent.forkedFrom,
      forked_at_message_index: parent.forkedAtMessageIndex,
    });

    // Fork the fork
    const child = forkSession(parent, 1, "Child");

    insertSession(db, child.id, {
      title: child.title,
      updated_at: child.updatedAt,
      first_message: child.messages[0]?.content ?? "",
      forked_from: child.forkedFrom,
      forked_at_message_index: child.forkedAtMessageIndex,
    });

    // Verify chain
    const fetchedChild = await svc.getSession(child.id);
    expect(fetchedChild!.forkedFrom).toBe(parent.id);

    const fetchedParent = await svc.getSession(parent.id);
    expect(fetchedParent!.forkedFrom).toBe("gp");

    const summaries = await svc.getSessionSummaries();
    expect(summaries).toHaveLength(3);
  });

  it("deleteSession on a forked session does not affect parent", async () => {
    insertSession(db, "parent-1", {
      title: "Parent",
      updated_at: 1000,
      first_message: "Parent msg",
    });

    const source = await svc.getSession("parent-1");
    const forked = forkSession(source!, 0, "Child");

    insertSession(db, forked.id, {
      title: forked.title,
      updated_at: forked.updatedAt,
      first_message: forked.messages[0]?.content ?? "",
      forked_from: forked.forkedFrom,
      forked_at_message_index: forked.forkedAtMessageIndex,
    });

    // Delete the fork
    await svc.deleteSession(forked.id);

    // Parent should still exist
    const parent = await svc.getSession("parent-1");
    expect(parent).not.toBeNull();

    // Fork should be gone
    const deleted = await svc.getSession(forked.id);
    expect(deleted).toBeNull();
  });
});
