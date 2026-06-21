import { describe, it, expect } from "vitest";
import { computeCost, getPricingTier } from "./model-pricing";

describe("computeCost", () => {
  it("computes cost for claude-sonnet-4-6", () => {
    const cost = computeCost("claude-sonnet-4-6", 1000000, 1000000);
    // 1M input * $3.00 + 1M output * $15.00 = $18.00
    expect(cost).toBeCloseTo(18.00, 2);
  });

  it("computes cost for deepseek-v4-pro", () => {
    const cost = computeCost("deepseek-v4-pro", 1000000, 1000000);
    // 1M * $0.27 + 1M * $1.10 = $1.37
    expect(cost).toBeCloseTo(1.37, 2);
  });

  it("rounds to cents", () => {
    const cost = computeCost("claude-haiku-4-5", 500, 300);
    // (500/1e6 * 0.80) + (300/1e6 * 4.00) = 0.0004 + 0.0012 = 0.0016 → $0.00
    expect(cost).toBe(0);
  });

  it("returns 0 for zero tokens", () => {
    expect(computeCost("gpt-4o", 0, 0)).toBe(0);
  });

  it("falls back to default pricing for unknown model", () => {
    const cost = computeCost("unknown-model", 1000000, 0);
    // 1M * $1.00 = $1.00
    expect(cost).toBeCloseTo(1.00, 2);
  });

  it("handles large token counts", () => {
    const cost = computeCost("claude-opus-4-7", 10000000, 5000000);
    // 10M * $15 + 5M * $75 = $150 + $375 = $525
    expect(cost).toBeCloseTo(525.00, 2);
  });
});

describe("getPricingTier", () => {
  it("returns tier for known model", () => {
    const tier = getPricingTier("claude-sonnet-4-6");
    expect(tier.inputPerMTok).toBe(3.00);
    expect(tier.outputPerMTok).toBe(15.00);
  });

  it("returns default tier for unknown model", () => {
    const tier = getPricingTier("nonexistent");
    expect(tier.inputPerMTok).toBe(1.00);
    expect(tier.outputPerMTok).toBe(5.00);
  });
});
