import type { TurnSummary } from "../runtime/types";

const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export function renderSummary(stats: TurnSummary): void {
  const icon = stats.reason === "error" ? "✗" : "✓";
  const parts = [
    `${icon} ${BOLD}Turn ${stats.turnNumber}${RESET}`,
    `${stats.totalTokens} tokens`,
    `$${stats.totalCost.toFixed(3)}`,
  ];

  if (stats.reason !== "completed") {
    parts.push(`(${stats.reason})`);
  }

  process.stdout.write(`\n${parts.join(" | ")}\n`);
}
