import { describe, expect, it } from "vitest";
import { createStatsCollector } from "../../src/observability/stats-collector";
import { LogEvent } from "../../src/observability/types";

describe("stats-collector", () => {
  it("counts turns from turn:end events", () => {
    const collector = createStatsCollector();

    collector.record({ type: "turn:end", turnNumber: 1, inputTokens: 100, outputTokens: 50 });
    collector.record({ type: "turn:end", turnNumber: 2, inputTokens: 200, outputTokens: 100 });
    collector.record({ type: "turn:end", turnNumber: 3, inputTokens: 150, outputTokens: 80 });

    expect(collector.getSessionStats().turns).toBe(3);
  });

  it("tracks files changed from Write/Edit tool:end events", () => {
    const collector = createStatsCollector();

    collector.record({
      type: "tool:end",
      toolName: "Write",
      durationMs: 10,
      success: true,
    });
    collector.record({
      type: "tool:end",
      toolName: "Edit",
      durationMs: 5,
      success: true,
    });
    collector.record({
      type: "tool:end",
      toolName: "Read",
      durationMs: 2,
      success: true,
    });

    // Only Write/Edit count as files changed
    expect(collector.getSessionStats().filesChanged).toEqual([
      "Write",
      "Edit",
    ]);
  });

  it("accumulates token counts from turn:end events", () => {
    const collector = createStatsCollector();

    collector.record({ type: "turn:end", turnNumber: 1, inputTokens: 500, outputTokens: 100 });
    collector.record({ type: "turn:end", turnNumber: 2, inputTokens: 300, outputTokens: 200 });

    const stats = collector.getSessionStats();
    expect(stats.totalInputTokens).toBe(800);
    expect(stats.totalOutputTokens).toBe(300);
  });

  it("accumulates cost from model:response events", () => {
    const collector = createStatsCollector();

    collector.record({
      type: "model:response",
      model: "deepseek-v4-pro",
      inputTokens: 1000,
      outputTokens: 200,
      cost: 0.0006,
    });
    collector.record({
      type: "model:response",
      model: "deepseek-v4-flash",
      inputTokens: 500,
      outputTokens: 100,
      cost: 0.0001,
    });

    expect(collector.getSessionStats().totalCost).toBeCloseTo(0.0007, 6);
  });

  it("returns zero stats initially", () => {
    const collector = createStatsCollector();
    const stats = collector.getSessionStats();
    expect(stats.turns).toBe(0);
    expect(stats.filesChanged).toEqual([]);
    expect(stats.totalInputTokens).toBe(0);
    expect(stats.totalOutputTokens).toBe(0);
    expect(stats.totalCost).toBe(0);
  });
});
