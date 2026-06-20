import type { ToolCardData } from "../../../types/tool-grid";

export function renderErrorAggregationPanel(failedTools: ToolCardData[], isExpanded: boolean): string {
  const count = failedTools.length;
  if (count === 0) return "";

  const expandedAttr = isExpanded ? "true" : "false";
  const errorLabel = count === 1 ? "1 error" : `${count} errors`;

  const header = `<div class="error-panel-header">
    <span class="error-panel-title">Errors</span>
    <span class="error-count-badge" aria-label="${errorLabel}">${escapeHtml(errorLabel)}</span>
    <button class="error-panel-toggle" data-action="toggle-error-panel" aria-expanded="${expandedAttr}" aria-label="${isExpanded ? "Collapse" : "Expand"} error list">
      <span class="error-panel-toggle-icon">${isExpanded ? "▼" : "▶"}</span>
    </button>
  </div>`;

  let listSection = "";
  if (isExpanded) {
    const items = failedTools.map((tool) => {
      const errorMsg = tool.error?.message ?? "Unknown error";
      return `<li class="error-item" data-tool-id="${escapeAttr(tool.toolId)}" data-action="scroll-to-tool" role="button" tabindex="0" aria-label="Jump to ${escapeAttr(tool.toolName)} error">
        <span class="error-item-tool font-mono">${escapeHtml(tool.toolName)}</span>
        <span class="error-item-message">${escapeHtml(errorMsg)}</span>
      </li>`;
    }).join("\n");

    listSection = `<ul class="error-item-list" role="list">${items}</ul>`;
  }

  return `<div class="error-aggregation-panel error-panel-sticky" role="alert" aria-live="polite" aria-label="${errorLabel}">
  ${header}
  ${listSection}
</div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
