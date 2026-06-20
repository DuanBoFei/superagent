import type { SessionSummary, Session, SessionStatus, SearchQuery } from "../../types/session-history";
import type { SessionDbService } from "../../services/session-db.service";

// ── selectSortedSessions ──────────────────────────────────

export function selectSortedSessions(
  sessions: SessionSummary[],
): SessionSummary[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── selectFilteredSessions ─────────────────────────────────

function matchesDateRange(s: SessionSummary, start?: number, end?: number): boolean {
  if (start != null && s.createdAt < start) return false;
  if (end != null && s.createdAt > end) return false;
  return true;
}

function matchesStatus(s: SessionSummary, statuses?: SessionStatus[]): boolean {
  if (!statuses || statuses.length === 0) return true;
  return statuses.includes(s.status);
}

function matchesTags(s: SessionSummary, tags?: string[]): boolean {
  if (!tags || tags.length === 0) return true;
  return tags.some((t) => s.tags.includes(t));
}

export function filterSessionsLocally(
  sessions: SessionSummary[],
  query: SearchQuery,
): SessionSummary[] {
  const { dateRange, statusFilter, tagsFilter } = query;

  return sessions.filter((s) => {
    if (!matchesDateRange(s, dateRange?.start, dateRange?.end)) return false;
    if (!matchesStatus(s, statusFilter ?? undefined)) return false;
    if (!matchesTags(s, tagsFilter ?? undefined)) return false;
    return true;
  });
}

export async function selectFilteredSessions(
  dbService: SessionDbService,
  sessions: SessionSummary[],
  query: SearchQuery,
): Promise<SessionSummary[]> {
  if (query.text && query.text.trim()) {
    return dbService.searchSessions(query);
  }

  const filtered = filterSessionsLocally(sessions, query);
  return selectSortedSessions(filtered);
}

// ── selectActiveSession ───────────────────────────────────

export async function selectActiveSession(
  dbService: SessionDbService,
  sessionId: string | null,
): Promise<Session | null> {
  if (!sessionId) return null;
  return dbService.getSession(sessionId);
}

// ── selectSessionTags ─────────────────────────────────────

export function selectSessionTags(
  sessions: SessionSummary[],
): string[] {
  const tagSet = new Set<string>();
  for (const s of sessions) {
    for (const tag of s.tags) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
}

// ── selectStats ───────────────────────────────────────────

export interface SessionStats {
  total: number;
  active: number;
  completed: number;
  error: number;
}

export function selectStats(sessions: SessionSummary[]): SessionStats {
  let active = 0;
  let completed = 0;
  let error = 0;

  for (const s of sessions) {
    switch (s.status) {
      case "active":
        active++;
        break;
      case "completed":
        completed++;
        break;
      case "error":
        error++;
        break;
    }
  }

  return {
    total: active + completed + error,
    active,
    completed,
    error,
  };
}
