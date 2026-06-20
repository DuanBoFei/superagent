import type { BashCard } from "../../../types/cards";
import { parseAnsiToHtml } from "../../../lib/ansi-parser";

const AUTO_COLLAPSE_LINES = 50;

export function renderBashCard(card: BashCard): string {
  const { command, args, output, exitCode, durationMs } = card.content;
  const fullCommand = [command, ...args].join(" ");

  const coloredOutput = parseAnsiToHtml(output);
  const lines = coloredOutput.split("\n");
  const totalLines = lines.length;
  const isLong = totalLines > AUTO_COLLAPSE_LINES;

  const displayLines = isLong ? lines.slice(0, 10) : lines;
  const outputHtml = displayLines.map((line) => `<span class="bash-line">${line || " "}</span>`).join("\n");

  const expandToggle = isLong
    ? `<button type="button" class="bash-expand-btn" data-action="expand-bash" data-card-id="${escapeAttr(card.id)}">
        Show all ${totalLines} lines
      </button>`
    : "";

  return `<div class="bash-card flex flex-col gap-1">
    <div class="bash-command font-mono text-xs text-neutral-400 bg-neutral-900 rounded px-2 py-1">
      <span class="text-emerald-400">$</span> ${escapeHtml(fullCommand)}
    </div>
    <pre class="bash-output font-mono text-xs text-neutral-200 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 overflow-x-auto ${isLong ? "bash-collapsible" : ""}" ${isLong ? 'data-collapsed="true"' : ""}>${outputHtml}</pre>
    ${expandToggle}
    <div class="bash-meta flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
      ${renderExitCode(exitCode)}
      ${renderDuration(durationMs)}
    </div>
  </div>`;
}

function renderExitCode(code: number | null): string {
  if (code === null) {
    return `<span class="bash-exit-code exit-pending">Exit: --</span>`;
  }
  const cls = code === 0 ? "exit-0 text-emerald-400" : "exit-nonzero text-red-400";
  return `<span class="bash-exit-code ${cls}">Exit: ${code}</span>`;
}

function renderDuration(ms: number | null): string {
  if (ms === null) {
    return `<span class="bash-duration duration-pending">--</span>`;
  }
  const seconds = ms / 1000;
  const formatted = seconds >= 1 ? `${seconds.toFixed(1)}s` : `${ms}ms`;
  return `<span class="bash-duration duration-value">${escapeHtml(formatted)}</span>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
