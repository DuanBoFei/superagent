import Database from "better-sqlite3";
import { initDb, upsertSession, getSession, listSessions } from "./store";
import { serialize, deserialize, SessionCorruptedError } from "./serializer";
import type { SessionRecord, SessionSummary, SaveResult } from "./types";
import type { SessionState } from "../runtime/types";

export { SessionCorruptedError };

export interface SessionManager {
  save(state: SessionState): SaveResult;
  load(id: string): SessionState | null;
  list(): SessionSummary[];
  close(): void;
}

export function createSessionManager(dbPath: string): SessionManager {
  const db = initDb(dbPath);

  return {
    save(state: SessionState): SaveResult {
      try {
        const record: SessionRecord = {
          id: state.sessionId,
          createdAt: state.startedAt,
          updatedAt: Date.now(),
          turnCount: state.turnNumber,
          firstMessage:
            state.messages.length > 0 && state.messages[0]!.role === "user"
              ? state.messages[0]!.content
              : "",
          stateJson: serialize(state),
        };
        upsertSession(db, record);
        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "unknown error",
        };
      }
    },

    load(id: string): SessionState | null {
      try {
        const record = getSession(db, id);
        if (!record) return null;
        return deserialize(record.stateJson);
      } catch (e) {
        if (e instanceof SessionCorruptedError) {
          return null;
        }
        throw e;
      }
    },

    list(): SessionSummary[] {
      return listSessions(db);
    },

    close(): void {
      db.close();
    },
  };
}
