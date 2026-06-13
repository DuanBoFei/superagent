import { CostModel, CostResult } from "./types";

export interface CostTracker {
  trackUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): CostResult;
  getSessionCost(): number;
}

export function createCostTracker(costModel: CostModel): CostTracker {
  let sessionCost = 0;

  function trackUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): CostResult {
    const price = costModel[model];
    if (!price) {
      return { inputCost: 0, outputCost: 0, totalCost: 0, unknownModel: true };
    }

    const inputCost = (inputTokens / 1_000_000) * price.inputPrice;
    const outputCost = (outputTokens / 1_000_000) * price.outputPrice;
    const totalCost = inputCost + outputCost;

    sessionCost += totalCost;

    return { inputCost, outputCost, totalCost };
  }

  function getSessionCost(): number {
    return sessionCost;
  }

  return { trackUsage, getSessionCost };
}
