import type { BaseCardState, ToolCardType } from "../../../types/cards";

const TYPE_LABELS: Record<ToolCardType, string> = {
  bash: "Bash",
  "file-read": "File Read",
  "file-write": "File Write",
  "file-edit": "File Edit",
  grep: "Grep",
  glob: "Glob",
  "task-list": "Task List",
  "sub-agent-grid": "Sub-Agents",
  "web-search": "Web Search",
};

const STATUS_INDICATORS: Record<string, string> = {
  pending: '<span class="card-status-dot card-status-pending" aria-label="Pending"></span>',
  running: '<span class="card-status-dot card-status-running" aria-label="Running"></span>',
  success: '<span class="card-status-dot card-status-success" aria-label="Success"></span>',
  error: '<span class="card-status-dot card-status-error" aria-label="Error"></span>',
};

export function renderCardHeader(card: BaseCardState): string {
  const typeLabel = TYPE_LABELS[card.type] ?? card.type;
  const statusIndicator = STATUS_INDICATORS[card.status] ?? "";
  const timestamp = new Date(card.timestamp).toISOString().replace("T", " ").slice(0, 19);

  const copyButton = `<button type="button" class="card-copy-btn" data-action="copy-card" data-card-id="${escapeAttr(card.id)}" aria-label="Copy card content" title="Copy">
    <svg class="card-copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
  </button>`;

  const toggleButton = card.isCollapsible
    ? `<button type="button" class="card-toggle-btn" data-action="toggle-card" data-card-id="${escapeAttr(card.id)}" aria-expanded="${card.isExpanded ? "true" : "false"}" aria-label="${card.isExpanded ? "Collapse card" : "Expand card"}">
        <svg class="card-toggle-icon ${card.isExpanded ? "card-toggle-expanded" : "card-toggle-collapsed"}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>`
    : "";

  return `<div class="card-header flex items-center gap-2 px-3 py-2 border-b border-neutral-800 bg-neutral-950/50" data-card-id="${escapeAttr(card.id)}" data-status="${escapeAttr(card.status)}">
    ${statusIndicator}
    <span class="card-type-label text-[11px] uppercase tracking-wide text-neutral-500 font-medium">${escapeHtml(typeLabel)}</span>
    <span class="card-title text-sm text-neutral-200 font-medium truncate flex-1">${escapeHtml(card.title)}</span>
    <span class="card-timestamp text-[11px] text-neutral-600 tabular-nums">${escapeHtml(timestamp)}</span>
    ${copyButton}
    ${toggleButton}
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
