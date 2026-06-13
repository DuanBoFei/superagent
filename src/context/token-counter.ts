let lastUsage: { input_tokens: number; output_tokens: number } | null = null;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function trackUsage(usage: { input_tokens: number; output_tokens: number }): void {
  lastUsage = usage;
}

export function getLastUsage(): { input_tokens: number; output_tokens: number } | null {
  return lastUsage;
}
