import type { ToolTimerState } from "../../../hooks/use-tool-timer";

export function renderToolTimer(state: ToolTimerState): string {
  const runningClass = state.running ? " tool-timer-running" : "";

  return `<span class="tool-timer${runningClass}" role="timer" aria-label="Elapsed time: ${escapeAttr(state.formatted)}">
  <span class="tool-timer-text font-mono text-xs text-neutral-400 tabular-nums">${escapeHtml(state.formatted)}</span>
</span>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
