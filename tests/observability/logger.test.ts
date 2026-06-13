import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createLogger } from "../../src/observability/logger";
import { LogEvent } from "../../src/observability/types";

function makeEvent(overrides?: Partial<LogEvent>): LogEvent {
  return {
    type: "session:start",
    sessionId: "test-session",
    config: { model: "deepseek-v4-pro", maxTurns: 50 },
    ...overrides,
  } as LogEvent;
}

describe("logger", () => {
  const dirs: string[] = [];

  function tempDir(): string {
    const d = mkdtempSync(join(tmpdir(), "obs-logger-"));
    dirs.push(d);
    return d;
  }

  afterEach(() => {
    for (const d of dirs) {
      try {
        const files = require("fs").readdirSync(d);
        for (const f of files) {
          try {
            unlinkSync(join(d, f));
          } catch { /* skip */ }
        }
        require("fs").rmdirSync(d);
      } catch { /* skip */ }
    }
  });

  it("writes events to temp file as JSON lines", () => {
    const logDir = tempDir();
    const logger = createLogger("sess-1", logDir);

    logger.log(makeEvent({ type: "session:start", sessionId: "sess-1" }));
    logger.log(makeEvent({ type: "turn:start", turnNumber: 1 }));
    logger.log(makeEvent({
      type: "model:response",
      model: "deepseek-v4-pro",
      inputTokens: 1000,
      outputTokens: 200,
      cost: 0.0006,
    }));

    logger.close();

    const files = require("fs").readdirSync(logDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.jsonl$/);

    const content = readFileSync(join(logDir, files[0]!), "utf-8").trim();
    const lines = content.split("\n");
    expect(lines.length).toBe(3);

    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty("type");
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("sessionId", "sess-1");
    }
  });

  it("each line is valid JSON with expected fields", () => {
    const logDir = tempDir();
    const logger = createLogger("sess-2", logDir);

    logger.log(makeEvent({
      type: "tool:start",
      toolName: "Grep",
      argsSummary: "pattern=foo",
    }));
    logger.close();

    const files = require("fs").readdirSync(logDir);
    const content = readFileSync(join(logDir, files[0]!), "utf-8").trim();
    const parsed = JSON.parse(content);

    expect(parsed.type).toBe("tool:start");
    expect(parsed.toolName).toBe("Grep");
    expect(parsed.argsSummary).toBe("pattern=foo");
    expect(parsed.sessionId).toBe("sess-2");
  });

  it("all event types can be logged", () => {
    const logDir = tempDir();
    const logger = createLogger("sess-all", logDir);

    const events: LogEvent[] = [
      { type: "session:start", sessionId: "sess-all", config: { model: "m", maxTurns: 50 } },
      { type: "turn:start", turnNumber: 1 },
      { type: "turn:end", turnNumber: 1, inputTokens: 500, outputTokens: 100 },
      { type: "model:request", model: "m", estimatedInputTokens: 500 },
      { type: "model:first_token", latencyMs: 1200 },
      { type: "model:response", model: "m", inputTokens: 500, outputTokens: 100, cost: 0.0003 },
      { type: "tool:start", toolName: "Read", argsSummary: "src/a.ts" },
      { type: "tool:end", toolName: "Read", durationMs: 50, success: true },
      { type: "error", message: "something broke", stack: "Error: ..." },
      { type: "session:end", exitCode: 0 },
    ];

    for (const e of events) logger.log(e);
    logger.close();

    const files = require("fs").readdirSync(logDir);
    const content = readFileSync(join(logDir, files[0]!), "utf-8").trim();
    const lines = content.split("\n");
    expect(lines.length).toBe(10);

    const types = lines.map((l) => JSON.parse(l).type);
    expect(types).toEqual([
      "session:start",
      "turn:start",
      "turn:end",
      "model:request",
      "model:first_token",
      "model:response",
      "tool:start",
      "tool:end",
      "error",
      "session:end",
    ]);
  });

  it("creates log directory if it does not exist", () => {
    const base = tempDir();
    const logDir = join(base, "nested", "logs");
    const logger = createLogger("sess-dir", logDir);

    logger.log(makeEvent());
    logger.close();

    expect(existsSync(logDir)).toBe(true);
  });

  it("does not throw on write failure (warns)", () => {
    // Create a file path that can't be written to by using a path
    // where a file exists as the directory name
    const base = tempDir();
    const blockFile = join(base, "block.jsonl");
    writeFileSync(blockFile, "block");
    // Now try to write logs to blockFile/logs — should fail
    const logDir = join(blockFile, "logs");

    const logger = createLogger("sess-fail", logDir);
    expect(() => logger.log(makeEvent())).not.toThrow();
    logger.close();
  });

  it("rotation creates new file when file exceeds size threshold", () => {
    const logDir = tempDir();
    const logger = createLogger("sess-rot", logDir, { maxSizeBytes: 200, checkInterval: 3 });

    // Write several events with a large payload to exceed 200 bytes
    const bigEvent: LogEvent = {
      type: "model:request",
      model: "deepseek-v4-pro",
      estimatedInputTokens: 100000,
    };

    // Write 5 events — should trigger rotation check at event 3
    for (let i = 0; i < 5; i++) {
      logger.log(bigEvent);
    }
    logger.close();

    const files = require("fs").readdirSync(logDir);
    // Should have at least 2 files (original + rotated)
    expect(files.length).toBeGreaterThanOrEqual(2);
  });
});
