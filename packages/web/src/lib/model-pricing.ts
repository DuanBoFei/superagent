const TOKENS_PER_MTok = 1_000_000;

interface PricingTier {
  inputPerMTok: number;
  outputPerMTok: number;
}

const MODEL_PRICING: Record<string, PricingTier> = {
  "claude-sonnet-4-6":    { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  "claude-opus-4-7":      { inputPerMTok: 15.00, outputPerMTok: 75.00 },
  "claude-haiku-4-5":     { inputPerMTok: 0.80, outputPerMTok: 4.00 },
  "deepseek-v4-pro":      { inputPerMTok: 0.27, outputPerMTok: 1.10 },
  "gpt-4o":               { inputPerMTok: 2.50, outputPerMTok: 10.00 },
};

const DEFAULT_PRICING: PricingTier = { inputPerMTok: 1.00, outputPerMTok: 5.00 };

export function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const tier = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  const inputCost = (inputTokens / TOKENS_PER_MTok) * tier.inputPerMTok;
  const outputCost = (outputTokens / TOKENS_PER_MTok) * tier.outputPerMTok;
  return Math.round((inputCost + outputCost) * 100) / 100;
}

export function getPricingTier(model: string): PricingTier {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}
