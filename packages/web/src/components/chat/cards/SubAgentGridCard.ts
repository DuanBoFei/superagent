import type { SubAgentGridCard } from "../../../types/cards";

export function renderSubAgentGridCard(card: SubAgentGridCard): string {
  const { cells, columns } = card.content;
  const colClass = columns === 1 ? "grid-cols-1" : "grid-cols-2";

  const cellHtml = cells.map((cell) => {
    const statusClass = cellStyle(cell.status);
    const progressBar = cell.status === "running" && cell.progress > 0
      ? `<div class="cell-progress-bar h-1 bg-neutral-800 rounded-full overflow-hidden mt-1">
        <div class="cell-progress-fill h-full bg-blue-500 rounded-full" style="width:${cell.progress}%"></div>
      </div>`
      : "";

    return `<div class="sub-agent-cell rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 ${statusClass}">
      <div class="cell-header flex items-center gap-1.5">
        <span class="cell-status-icon text-xs">${statusDot(cell.status)}</span>
        <span class="cell-title text-xs font-medium text-neutral-300">${escapeHtml(cell.title)}</span>
        ${cell.status === "running" ? `<span class="cell-progress-text text-[10px] text-neutral-600 ml-auto">${cell.progress}%</span>` : ""}
      </div>
      ${cell.output ? `<pre class="cell-output font-mono text-[11px] text-neutral-400 mt-1.5 whitespace-pre-wrap overflow-x-auto max-h-24 overflow-y-auto">${escapeHtml(cell.output)}</pre>` : ""}
      ${progressBar}
    </div>`;
  }).join("\n");

  return `<div class="sub-agent-grid-card flex flex-col gap-1">
    <div class="sub-agent-grid grid ${colClass} gap-2">
      ${cellHtml}
    </div>
  </div>`;
}

function statusDot(status: string): string {
  switch (status) {
    case "running": return `<span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>`;
    case "success": return `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>`;
    case "error": return `<span class="inline-block w-2 h-2 rounded-full bg-red-400"></span>`;
    default: return `<span class="inline-block w-2 h-2 rounded-full bg-neutral-600"></span>`;
  }
}

function cellStyle(status: string): string {
  switch (status) {
    case "running": return "border-l-2 border-l-amber-500";
    case "success": return "border-l-2 border-l-emerald-500";
    case "error": return "border-l-2 border-l-red-500";
    default: return "";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
