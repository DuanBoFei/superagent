import pino from "pino";
import { mkdirSync, statSync, renameSync, existsSync } from "fs";
import { dirname } from "path";
import { LogEvent } from "./types";

export interface Logger {
  log(event: LogEvent): void;
  close(): void;
  getPath(): string;
}

let _warnedWriteFailure = false;

export function createLogger(
  sessionId: string,
  logDir: string,
  opts?: { maxSizeBytes?: number; checkInterval?: number },
): Logger {
  const maxSizeBytes = opts?.maxSizeBytes ?? 50 * 1024 * 1024;
  const checkInterval = opts?.checkInterval ?? 100;

  let destination: pino.DestinationStream | null = null;
  let eventCount = 0;

  const timestamp = new Date()
    .toISOString()
    .replace(/T/, "-")
    .replace(/:/g, "")
    .slice(0, 15);
  let currentPath = `${logDir}/${timestamp}-${sessionId}.jsonl`;

  function openStream(): pino.DestinationStream | null {
    try {
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      return pino.destination({ dest: currentPath, sync: true });
    } catch {
      if (!_warnedWriteFailure) {
        console.warn("[OBS] Cannot write to log file:", currentPath);
        _warnedWriteFailure = true;
      }
      return null;
    }
  }

  destination = openStream();

  let pinoLogger: pino.Logger | null = destination
    ? pino({ base: {}, timestamp: false }, destination)
    : null;

  function rotate(): void {
    if (!destination) return;
    // Rename current file → .1, .2 etc
    for (let i = 2; i >= 1; i--) {
      const older = `${currentPath}.${i}`;
      const newer = `${currentPath}.${i + 1}`;
      if (existsSync(older)) renameSync(older, newer);
    }
    const firstRotated = `${currentPath}.1`;
    if (existsSync(firstRotated)) renameSync(firstRotated, `${currentPath}.2`);
    if (existsSync(currentPath)) renameSync(currentPath, firstRotated);

    // Reopen
    try {
      destination = pino.destination({ dest: currentPath, sync: true });
      pinoLogger = destination
        ? pino({ base: {}, timestamp: false }, destination)
        : null;
    } catch {
      destination = null;
      pinoLogger = null;
    }
  }

  function log(event: LogEvent): void {
    eventCount++;

    // Check rotation
    if (
      destination &&
      eventCount % checkInterval === 0
    ) {
      try {
        const stat = statSync(currentPath);
        if (stat.size > maxSizeBytes) {
          rotate();
        }
      } catch {
        // stat failed, skip rotation check
      }
    }

    if (!pinoLogger) {
      if (!_warnedWriteFailure) {
        console.warn("[OBS] Cannot write to log file:", currentPath);
        _warnedWriteFailure = true;
      }
      return;
    }

    try {
      pinoLogger.info({
        ...event,
        timestamp: new Date().toISOString(),
        sessionId,
      });
    } catch {
      if (!_warnedWriteFailure) {
        console.warn("[OBS] Write failed, logging disabled");
        _warnedWriteFailure = true;
      }
    }
  }

  function close(): void {
    if (destination) {
      try {
        destination.end();
      } catch {
        // ignore close errors
      }
    }
  }

  function getPath(): string {
    return currentPath;
  }

  return { log, close, getPath };
}
