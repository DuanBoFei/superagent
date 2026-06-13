import { createPersistence } from "../../persistence";
import type { SessionManager } from "../../persistence";
import { createMemoryStore } from "../../persistence/memory-store";
import type { SessionState } from "../types";

let _manager: SessionManager | null = null;
let _diskFailed = false;

function getManager(): SessionManager {
  if (!_manager) {
    try {
      _manager = createPersistence();
    } catch (e) {
      process.stderr.write(
        `[PERSIST] disk init failed, using in-memory mode: ${e instanceof Error ? e.message : "unknown error"}\n`,
      );
      _diskFailed = true;
      _manager = createMemoryStore();
    }
  }
  return _manager;
}

export function saveSession(state: SessionState): void {
  const mgr = getManager();
  const result = mgr.save(state);

  if (!result.success) {
    if (!_diskFailed) {
      process.stderr.write(
        `[PERSIST] save failed, switching to in-memory mode: ${result.error}\n`,
      );
      _diskFailed = true;
      // Retry with memory store
      _manager = createMemoryStore();
      _manager.save(state);
      return;
    }
    console.error("[PERSIST] save failed:", result.error);
  }
}

export function loadSession(id: string): SessionState | null {
  return getManager().load(id);
}

export function listSessions() {
  return getManager().list();
}
