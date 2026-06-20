import Database from "better-sqlite3";
import type {
  SessionSummary,
  Session,
  SessionStatus,
  SearchQuery,
} from "../types/session-history";

export interface SessionDbQueryResult {
  id: string;
  created_at: number;
  updated_at: number;
  turn_count: number;
  first_message: string;
  state_json: string;
  title: string;
  status: string;
  duration_ms: number;
  tool_call_count: number;
  message_count: number;
  forked_from: string | null;
  forked_at_message_index: number | null;
  messages_content: string;
}

const SUMMARY_COLS = [
  "s.id",
  "s.created_at",
  "s.updated_at",
  "s.first_message",
  "s.title",
  "s.status",
  "s.duration_ms",
  "s.tool_call_count",
  "s.message_count",
  "s.forked_from",
  "s.messages_content",
].join(", ");

const SUMMARY_SQL = `SELECT ${SUMMARY_COLS} FROM sessions s ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`;

const GET_SQL = `SELECT s.* FROM sessions s WHERE id = ?`;

const SEARCH_SQL = `
SELECT ${SUMMARY_COLS}
FROM sessions_fts fts
JOIN sessions s ON s.id = fts.session_id
WHERE sessions_fts MATCH ?
ORDER BY rank
LIMIT ?
`;

const UPDATE_SQL = `
UPDATE sessions SET
  title = COALESCE(?, title),
  status = COALESCE(?, status),
  updated_at = ?
WHERE id = ?
`;

const DELETE_SQL = `DELETE FROM sessions WHERE id = ?`;
const DELETE_TAGS_SQL = `DELETE FROM session_tags WHERE session_id = ?`;

const ADD_TAG_SQL = `INSERT OR IGNORE INTO session_tags (session_id, tag) VALUES (?, ?)`;
const REMOVE_TAG_SQL = `DELETE FROM session_tags WHERE session_id = ? AND tag = ?`;
const GET_TAGS_SQL = `SELECT tag FROM session_tags WHERE session_id = ?`;
const ALL_TAGS_SQL = `SELECT DISTINCT tag FROM session_tags ORDER BY tag`;
const TAGS_FOR_SESSIONS_SQL = `SELECT session_id, tag FROM session_tags WHERE session_id IN (`;

function rowToSummary(
  row: SessionDbQueryResult,
  tags: string[],
): SessionSummary {
  return {
    id: row.id,
    title: row.title || "",
    firstMessagePreview: (row.first_message || "").slice(0, 100),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    durationMs: row.duration_ms,
    toolCallCount: row.tool_call_count,
    messageCount: row.message_count,
    status: row.status as SessionStatus,
    tags,
    forkedFrom: row.forked_from,
  };
}

export class SessionDbService {
  constructor(private db: Database.Database) {}

  async getSessionSummaries(
    limit = 50,
    offset = 0,
  ): Promise<SessionSummary[]> {
    const rows = this.db
      .prepare(SUMMARY_SQL)
      .all(limit, offset) as SessionDbQueryResult[];

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(", ");
    const tags = this.db
      .prepare(`${TAGS_FOR_SESSIONS_SQL} ${placeholders})`)
      .all(...ids) as Array<{ session_id: string; tag: string }>;

    const tagsMap = new Map<string, string[]>();
    for (const t of tags) {
      const list = tagsMap.get(t.session_id);
      if (list) list.push(t.tag);
      else tagsMap.set(t.session_id, [t.tag]);
    }

    return rows.map((r) => rowToSummary(r, tagsMap.get(r.id) ?? []));
  }

  async getSession(id: string): Promise<Session | null> {
    const row = this.db
      .prepare(GET_SQL)
      .get(id) as SessionDbQueryResult | undefined;
    if (!row) return null;

    const tags = this.db
      .prepare(GET_TAGS_SQL)
      .all(id) as Array<{ tag: string }>;

    return {
      id: row.id,
      title: row.title || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      durationMs: row.duration_ms,
      toolCallCount: row.tool_call_count,
      messageCount: row.message_count,
      status: row.status as SessionStatus,
      tags: tags.map((t) => t.tag),
      forkedFrom: row.forked_from,
      forkedAtMessageIndex: row.forked_at_message_index,
      messages: [],
      toolCalls: [],
    };
  }

  async updateSession(
    id: string,
    updates: { title?: string; status?: SessionStatus },
  ): Promise<void> {
    this.db
      .prepare(UPDATE_SQL)
      .run(updates.title ?? null, updates.status ?? null, Date.now(), id);
  }

  async deleteSession(id: string): Promise<void> {
    this.db.prepare(DELETE_SQL).run(id);
  }

  async deleteSessions(ids: string[]): Promise<void> {
    const deleteStmt = this.db.prepare(DELETE_SQL);
    const deleteMany = this.db.transaction(() => {
      for (const id of ids) {
        deleteStmt.run(id);
      }
    });
    deleteMany();
  }

  async searchSessions(query: SearchQuery): Promise<SessionSummary[]> {
    const { text, dateRange, statusFilter, tagsFilter } = query;

    // FTS5 search
    let rows: SessionDbQueryResult[];
    if (text && text.trim()) {
      const ftsQuery = `"${text.replace(/"/g, '""')}"`;
      rows = this.db
        .prepare(SEARCH_SQL)
        .all(ftsQuery, 50) as SessionDbQueryResult[];
    } else {
      rows = this.db
        .prepare(
          `SELECT ${SUMMARY_COLS} FROM sessions s ORDER BY s.updated_at DESC LIMIT 50`,
        )
        .all() as SessionDbQueryResult[];
    }

    // Filters
    if (dateRange) {
      rows = rows.filter(
        (r) =>
          r.created_at >= dateRange.start && r.created_at <= dateRange.end,
      );
    }
    if (statusFilter && statusFilter.length > 0) {
      const set = new Set(statusFilter);
      rows = rows.filter((r) => set.has(r.status as SessionStatus));
    }

    // Tag filter
    if (tagsFilter && tagsFilter.length > 0) {
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return [];

      const placeholders = ids.map(() => "?").join(", ");
      const tagQuery = `SELECT session_id FROM session_tags WHERE tag IN (${tagsFilter.map(() => "?").join(", ")}) AND session_id IN (${placeholders})`;
      const matched = new Set(
        (
          this.db.prepare(tagQuery).all(...tagsFilter, ...ids) as Array<{
            session_id: string;
          }>
        ).map((t) => t.session_id),
      );
      rows = rows.filter((r) => matched.has(r.id));
    }

    // Batch-load tags
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => "?").join(", ");
    const tagRows = this.db
      .prepare(`${TAGS_FOR_SESSIONS_SQL} ${placeholders})`)
      .all(...ids) as Array<{ session_id: string; tag: string }>;

    const tagsMap = new Map<string, string[]>();
    for (const t of tagRows) {
      const list = tagsMap.get(t.session_id);
      if (list) list.push(t.tag);
      else tagsMap.set(t.session_id, [t.tag]);
    }

    return rows.map((r) => rowToSummary(r, tagsMap.get(r.id) ?? []));
  }

  async addTag(sessionId: string, tag: string): Promise<void> {
    this.db.prepare(ADD_TAG_SQL).run(sessionId, tag);
  }

  async removeTag(sessionId: string, tag: string): Promise<void> {
    this.db.prepare(REMOVE_TAG_SQL).run(sessionId, tag);
  }

  async getAllTags(): Promise<string[]> {
    const rows = this.db.prepare(ALL_TAGS_SQL).all() as Array<{ tag: string }>;
    return rows.map((r) => r.tag);
  }

  close(): void {
    // DB lifecycle managed externally; no-op
  }
}
