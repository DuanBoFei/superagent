import type { SessionManager } from "./session-manager";
import type { SessionState } from "../runtime/types";
import type { SaveResult, SessionSummary } from "./types";

export function createMemoryStore(): SessionManager {
  const sessions = new Map<string, SessionState>();

  return {
    save(state: SessionState): SaveResult {
      try {
        sessions.set(state.sessionId, state);
        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "unknown error",
        };
      }
    },

    load(id: string): SessionState | null {
      return sessions.get(id) ?? null;
    },

    list(): SessionSummary[] {
      const results: SessionSummary[] = [];
      for (const [id, state] of sessions) {
        const firstUserMsg = state.messages.find((m) => m.role === "user");
        const now = Date.now();
        results.push({
          id,
          date: new Date(state.startedAt).toISOString(),
          createdAt: state.startedAt,
          updatedAt: now,
          turns: state.turnNumber,
          firstMessage: firstUserMsg?.content ?? "",
        });
      }
      results.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return results;
    },

    close(): void {
      sessions.clear();
    },
  };
}
