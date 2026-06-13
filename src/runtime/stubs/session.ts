import { createPersistence } from "../../persistence";
import type { SessionManager } from "../../persistence";
import type { SessionState } from "../types";

let _manager: SessionManager | null = null;

function getManager(): SessionManager {
  if (!_manager) {
    _manager = createPersistence();
  }
  return _manager;
}

export function saveSession(state: SessionState): void {
  const result = getManager().save(state);
  if (!result.success) {
    console.error("[PERSIST] save failed:", result.error);
  }
}

export function loadSession(id: string): SessionState | null {
  return getManager().load(id);
}

export function listSessions() {
  return getManager().list();
}
