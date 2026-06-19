export interface ErrorCardContent {
  errorType: string;
  message: string;
  stackTrace?: string;
}

export interface ErrorCardState {
  id: string;
  status: "error";
  timestamp: number;
  title: string;
  isExpanded: boolean;
  content: ErrorCardContent;
}

export function renderErrorCard(card: ErrorCardState): string {
  const { errorType, message, stackTrace } = card.content;
  const hasStack = stackTrace && stackTrace.length > 0;

  const stackSection = hasStack
    ? `<div class="error-stack-wrapper ${card.isExpanded ? "" : "hidden"}">
      <pre class="error-stack font-mono text-xs text-red-300/80 bg-red-950/30 rounded border border-red-900/40 mt-2 px-3 py-2 overflow-x-auto max-h-60 overflow-y-auto">${escapeHtml(stackTrace!)}</pre>
    </div>`
    : "";

  const toggleButton = hasStack
    ? `<button type="button" class="error-toggle-btn text-[11px] text-red-400 hover:text-red-300 mt-1" data-action="toggle-error-stack" data-card-id="${escapeAttr(card.id)}">${card.isExpanded ? "Hide" : "Show"} stack trace</button>`
    : "";

  return `<div class="error-card flex flex-col gap-1 border-l-2 border-red-600 pl-3 py-1">
    <div class="error-header flex items-center gap-2">
      <span class="error-icon text-red-500 text-sm">&#10060;</span>
      <span class="error-type font-mono text-xs font-medium text-red-400">${escapeHtml(errorType)}</span>
    </div>
    <div class="error-message text-sm text-red-200">${escapeHtml(message)}</div>
    ${toggleButton}
    ${stackSection}
    <button type="button" class="error-copy-btn text-[11px] text-neutral-500 hover:text-neutral-300 mt-1" data-action="copy-error" data-card-id="${escapeAttr(card.id)}">Copy error details</button>
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
