import { describe, expect, it } from "vitest";
import { createCostTracker } from "../../src/observability/cost-tracker";
import { CostModel } from "../../src/observability/types";

const COST_MODEL: CostModel = {
  "deepseek-v4-pro": { inputPrice: 0.435, outputPrice: 0.87 },
  "deepseek-v4-flash": { inputPrice: 0.14, outputPrice: 0.28 },
};

describe("cost-tracker", () => {
  it("calculates correct cost for V4 Pro with known token counts", () => {
    const tracker = createCostTracker(COST_MODEL);
    const result = tracker.trackUsage("deepseek-v4-pro", 5000, 1000);

    // input: (5000 / 1,000,000) * 0.435 = 0.002175
    // output: (1000 / 1,000,000) * 0.87 = 0.00087
    // total: 0.003045
    expect(result.inputCost).toBeCloseTo(0.002175, 6);
    expect(result.outputCost).toBeCloseTo(0.00087, 6);
    expect(result.totalCost).toBeCloseTo(0.003045, 6);
  });

  it("same tokens for V4 Flash yield lower cost than V4 Pro", () => {
    const tracker = createCostTracker(COST_MODEL);
    const proResult = tracker.trackUsage("deepseek-v4-pro", 5000, 1000);
    const flashResult = tracker.trackUsage("deepseek-v4-flash", 5000, 1000);

    // flash: (5000/1M)*0.14 + (1000/1M)*0.28 = 0.0007 + 0.00028 = 0.00098
    expect(flashResult.totalCost).toBeLessThan(proResult.totalCost);
    expect(flashResult.inputCost).toBeCloseTo(0.0007, 6);
    expect(flashResult.outputCost).toBeCloseTo(0.00028, 6);
    expect(flashResult.totalCost).toBeCloseTo(0.00098, 6);
  });

  it("returns zero cost with unknown flag for unknown model", () => {
    const tracker = createCostTracker(COST_MODEL);
    const result = tracker.trackUsage("unknown-model", 1000, 500);

    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.unknownModel).toBe(true);
  });

  it("accumulates cost across multiple calls", () => {
    const tracker = createCostTracker(COST_MODEL);

    tracker.trackUsage("deepseek-v4-pro", 1000, 200);
    expect(tracker.getSessionCost()).toBeGreaterThan(0);

    const before = tracker.getSessionCost();
    tracker.trackUsage("deepseek-v4-flash", 2000, 500);
    const after = tracker.getSessionCost();
    expect(after).toBeGreaterThan(before);
  });

  it("getSessionCost returns 0 when no usage tracked", () => {
    const tracker = createCostTracker(COST_MODEL);
    expect(tracker.getSessionCost()).toBe(0);
  });

  it("cost per MTok matches spec prices", () => {
    const tracker = createCostTracker(COST_MODEL);

    // 1M input + 1M output for V4 Pro
    const result = tracker.trackUsage("deepseek-v4-pro", 1_000_000, 1_000_000);
    expect(result.inputCost).toBeCloseTo(0.435, 4);
    expect(result.outputCost).toBeCloseTo(0.87, 4);
    expect(result.totalCost).toBeCloseTo(1.305, 4);
  });
});
