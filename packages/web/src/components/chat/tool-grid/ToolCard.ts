import type { ToolCardData } from "../../../types/tool-grid";
import type { ToolTimerState } from "../../../hooks/use-tool-timer";
import { renderToolProgressBar } from "./ToolProgressBar";
import { renderToolTimer } from "./ToolTimer";
import { renderTerminal } from "../terminal/TerminalRenderer";

// ── Tool Label ──────────────────────────────────────────

const TOOL_LABEL: Record<string, string> = {
  read: "Read",
  write: "Write",
  edit: "Edit",
  bash: "Bash",
  grep: "Grep",
  glob: "Glob",
  task: "Task",
  websearch: "WebSearch",
};

function toolLabel(name: string): string {
  return TOOL_LABEL[name.toLowerCase()] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Timer State ─────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function computeTimerState(data: ToolCardData): ToolTimerState {
  const { startTime, endTime, durationMs } = data;
  const elapsedMs = endTime !== null ? Math.max(0, endTime - startTime) : (durationMs ?? 0);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  return {
    formatted: formatTime(totalSeconds),
    running: endTime === null && data.status === "running",
    elapsedMs,
  };
}

// ── Parameter Summary ───────────────────────────────────

function renderParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) return "";
  const items = entries.slice(0, 3).map(([key, value]) => {
    const val = typeof value === "string" ? value : JSON.stringify(value);
    return `<span class="tool-param"><span class="tool-param-key">${escapeHtml(key)}</span>: ${escapeHtml(val)}</span>`;
  }).join("");
  return `<div class="tool-params">${items}</div>`;
}

// ── Output Rendering ────────────────────────────────────

function renderOutput(preview: string[], full: string, expanded: boolean, toolName?: string): string {
  if (!full && preview.length === 0) return "";

  if (expanded && toolName === "bash") {
    // Use TerminalRenderer for ANSI color rendering
    const terminalHtml = renderTerminal(full, { maxLines: 500 });
    return `<div class="tool-output-full">${terminalHtml}</div>`;
  }

  if (expanded) {
    const lines = full.split("\n").map((line) => `<span class="tool-output-line">${escapeHtml(line)}</span>`).join("\n");
    return `<div class="tool-output-full"><pre class="tool-output-pre">${lines}</pre></div>`;
  }

  const previewLines = preview.map((line) => `<span class="tool-output-line">${escapeHtml(line)}</span>`).join("\n");
  return `<div class="tool-output-preview"><pre class="tool-output-pre">${previewLines}</pre></div>`;
}

// ── Async Lazy Loading ──────────────────────────────────

export async function renderBashOutputAsync(content: string): Promise<string> {
  const { renderTerminal } = await import("../terminal/TerminalRenderer");
  return renderTerminal(content, { maxLines: 500 });
}

// ── Error Rendering ─────────────────────────────────────

function renderError(error: { message: string; stack?: string }): string {
  const stackSection = error.stack ? `<pre class="tool-error-stack">${escapeHtml(error.stack)}</pre>` : "";
  return `<div class="tool-card-error">
    <span class="tool-error-message">${escapeHtml(error.message)}</span>
    ${stackSection}
  </div>`;
}

// ── Main Render ─────────────────────────────────────────

export function renderToolCard(data: ToolCardData): string {
  const { toolId, toolName, parameters, status, progress, isExpanded, error, outputPreview, fullOutput } = data;
  const label = toolLabel(toolName);
  const timerState = computeTimerState(data);
  const expandedAttr = isExpanded ? "true" : "false";

  const header = `<div class="tool-card-header">
    <span class="tool-card-label">${escapeHtml(label)}</span>
    <span class="tool-card-name font-mono text-xs text-neutral-400">${escapeHtml(toolName)}</span>
    ${renderToolTimer(timerState)}
    <button class="tool-card-toggle" data-action="toggle-card" aria-expanded="${expandedAttr}" aria-label="${isExpanded ? "Collapse" : "Expand"} tool card">
      <span class="tool-card-toggle-icon">${isExpanded ? "▼" : "▶"}</span>
    </button>
  </div>`;

  const progressBar = renderToolProgressBar({ progress, status });
  const paramsSection = renderParams(parameters);
  const outputSection = renderOutput(outputPreview, fullOutput, isExpanded, toolName);
  const errorSection = error ? renderError(error) : "";

  return `<div class="tool-card card-status-${escapeAttr(status)}" data-tool-id="${escapeAttr(toolId)}" data-status="${escapeAttr(status)}">
  ${header}
  <div class="tool-card-body">
    ${paramsSection}
    ${progressBar}
    ${outputSection}
    ${errorSection}
  </div>
</div>`;
}

// ── XSS Helpers ─────────────────────────────────────────

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
