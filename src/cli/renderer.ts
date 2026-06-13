import type { TurnEvent } from "../runtime/types";
import type { TerminalConfig } from "./types";

export function dispatchEvent(
  event: TurnEvent,
  _config: TerminalConfig,
): void {
  switch (event.type) {
    case "text":
      process.stdout.write(event.content);
      break;
    case "tool_call":
      process.stdout.write(`[${event.name}] ${summarizeArgs(event.args)}\n`);
      break;
    case "tool_result":
      process.stdout.write(
        `${event.success ? "✓" : "✗"} [${event.name}] ${event.summary}\n`,
      );
      break;
    case "turn_end":
      process.stdout.write(
        `\n✓ Turn ${event.summary.turnNumber} | ${event.summary.totalTokens} tokens | $${event.summary.totalCost.toFixed(3)}\n`,
      );
      break;
    case "error":
      process.stderr.write(`✗ ${event.message}\n`);
      break;
    default:
      break;
  }
}

function summarizeArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args).slice(0, 2);
  return entries.map(([k, v]) => `${k}=${String(v).slice(0, 40)}`).join(", ");
}
