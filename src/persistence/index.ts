import { mkdirSync } from "fs";
import { createSessionManager } from "./session-manager";
import type { SessionManager } from "./session-manager";
import { homedir } from "os";
import { join, dirname } from "path";

export type { SessionManager } from "./session-manager";
export { SessionCorruptedError } from "./session-manager";
export type { SessionRecord, SessionSummary, SaveResult } from "./types";

export function createPersistence(dbPath?: string): SessionManager {
  const path = dbPath ?? join(homedir(), ".superagent", "sessions.db");
  mkdirSync(dirname(path), { recursive: true });
  return createSessionManager(path);
}
