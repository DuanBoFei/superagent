import { describe, expect, it } from "vitest";
import { readFileSync, rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createObservability } from "../../src/observability/index";
import { Config } from "../../src/config/types";

function tempConfig(): Config {
  return {
    apiKey: "sk-test",
    model: "deepseek-v4-pro",
    baseUrl: "https://api.deepseek.com",
    maxTurns: 50,
    fallbackModel: "deepseek-v4-flash",
    fallbackBaseUrl: "https://api.deepseek.com",
    permissions: { autoApprove: [], deny: [], askTimeout: 30 },
    rulesFile: "CLAUDE.md",
  };
}

describe("integration", () => {
  it("emits full lifecycle and produces correct log file", () => {
    const logDir = mkdtempSync(join(tmpdir(), "obs-integration-XXXXXX"));

    try {
      const obs = createObservability(tempConfig(), "sess-001", { logDir, verbose: true });

      // session:start
      obs.emit({
        type: "session:start",
        sessionId: "sess-001",
        config: { model: "deepseek-v4-pro", maxTurns: 50 },
      });

      expect(obs.getSessionStats().turns).toBe(0);

      // turn:start
      obs.emit({ type: "turn:start", turnNumber: 1 });

      // model:request
      obs.emit({
        type: "model:request",
        model: "deepseek-v4-pro",
        estimatedInputTokens: 5000,
      });

      // model:first_token
      obs.emit({ type: "model:first_token", latencyMs: 800 });

      // tool:start
      obs.emit({ type: "tool:start", toolName: "Read", argsSummary: 'file_path="src/a.ts"' });

      // tool:end
      obs.emit({ type: "tool:end", toolName: "Read", durationMs: 5, success: true });

      // model:response
      obs.emit({
        type: "model:response",
        model: "deepseek-v4-pro",
        inputTokens: 5000,
        outputTokens: 200,
        cost: 0,
      });

      // turn:end
      obs.emit({ type: "turn:end", turnNumber: 1, inputTokens: 5000, outputTokens: 200 });

      // session:end
      obs.emit({ type: "session:end", exitCode: 0 });

      // Stats
      const stats = obs.getSessionStats();
      expect(stats.turns).toBe(1);
      expect(stats.totalInputTokens).toBe(5000);
      expect(stats.totalOutputTokens).toBe(200);
      expect(stats.totalCost).toBeGreaterThan(0);

      // Log file
      const logPath = obs.getSessionLogPath();
      const logContent = readFileSync(logPath, "utf-8").trim();
      const lines = logContent.split("\n");
      expect(lines.length).toBe(9);

      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty("type");
        expect(parsed).toHaveProperty("timestamp");
        expect(parsed.sessionId).toBe("sess-001");
      }

      // Verify event types in order
      const types = lines.map((l) => JSON.parse(l).type);
      expect(types).toEqual([
        "session:start",
        "turn:start",
        "model:request",
        "model:first_token",
        "tool:start",
        "tool:end",
        "model:response",
        "turn:end",
        "session:end",
      ]);

      obs.close();
    } finally {
      rmSync(logDir, { recursive: true, force: true });
    }
  });

  it("tracks cost correctly across multiple model calls", () => {
    const logDir = mkdtempSync(join(tmpdir(), "obs-integration-XXXXXX"));

    try {
      const obs = createObservability(tempConfig(), "sess-002", { logDir });

      obs.emit({
        type: "model:response",
        model: "deepseek-v4-pro",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cost: 0,
      });

      // 1M input * $0.435/MTok + 1M output * $0.87/MTok = $0.435 + $0.87 = $1.305
      expect(obs.getSessionStats().totalCost).toBeCloseTo(1.305, 3);

      obs.emit({
        type: "model:response",
        model: "deepseek-v4-flash",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cost: 0,
      });

      // Additional: 1M * $0.14 + 1M * $0.28 = $0.14 + $0.28 = $0.42
      // Total: $1.305 + $0.42 = $1.725
      expect(obs.getSessionStats().totalCost).toBeCloseTo(1.725, 3);

      obs.close();
    } finally {
      rmSync(logDir, { recursive: true, force: true });
    }
  });

  it("handles unknown model gracefully", () => {
    const logDir = mkdtempSync(join(tmpdir(), "obs-integration-XXXXXX"));

    try {
      const obs = createObservability(tempConfig(), "sess-003", { logDir });

      // Emitting with unknown model should not throw and should produce a log entry
      expect(() =>
        obs.emit({
          type: "model:response",
          model: "unknown-model",
          inputTokens: 1000,
          outputTokens: 100,
          cost: 0,
        }),
      ).not.toThrow();

      // Cost should remain zero for unknown model
      expect(obs.getSessionStats().totalCost).toBe(0);

      obs.close();
    } finally {
      rmSync(logDir, { recursive: true, force: true });
    }
  });

  it("verbose disabled does not crash", () => {
    const logDir = mkdtempSync(join(tmpdir(), "obs-integration-XXXXXX"));

    try {
      // verbose not enabled
      const obs = createObservability(tempConfig(), "sess-004", { logDir });

      obs.emit({
        type: "model:request",
        model: "deepseek-v4-pro",
        estimatedInputTokens: 5000,
      });

      obs.emit({
        type: "model:response",
        model: "deepseek-v4-pro",
        inputTokens: 5000,
        outputTokens: 200,
        cost: 0,
      });

      const stats = obs.getSessionStats();
      expect(stats.totalInputTokens).toBe(0); // Only turn:end updates token counts
      expect(stats.totalCost).toBeGreaterThan(0); // model:response updates cost

      obs.close();
    } finally {
      rmSync(logDir, { recursive: true, force: true });
    }
  });
});
