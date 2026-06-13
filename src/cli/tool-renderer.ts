import type { TerminalConfig } from "./types";

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

let lastRenderMs = 0;

export function renderToolCall(
  name: string,
  args: Record<string, unknown>,
  _config: TerminalConfig,
): void {
  const entries = Object.entries(args).slice(0, 2);
  const summary = entries
    .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
    .join(", ");
  process.stdout.write(dim(`[${name}] ${summary}`) + "\n");
  lastRenderMs = Date.now();
}

export function renderToolResult(
  name: string,
  success: boolean,
  summary: string,
  config: TerminalConfig,
): void {
  if (!config.supportsColor) {
    process.stdout.write(
      `${success ? "OK" : "FAIL"} [${name}] ${summary}\n`,
    );
    return;
  }

  const icon = success ? green("✓") : red("✗");
  process.stdout.write(`${icon} [${name}] ${summary}\n`);
}

export function throttleReset(): void {
  lastRenderMs = 0;
}
