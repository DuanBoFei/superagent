import type { FileEditCard } from "../../../types/cards";

const AUTO_COLLAPSE_DIFF_LINES = 100;

export function renderFileEditCard(card: FileEditCard): string {
  const { filePath, diff, linesAdded, linesRemoved } = card.content;
  const diffLines = diff.split("\n");
  const isLong = diffLines.length > AUTO_COLLAPSE_DIFF_LINES;
  const displayLines = isLong ? diffLines.slice(0, 20) : diffLines;

  const highlighted = displayLines.map((line) => {
    if (line.startsWith("+")) {
      return `<span class="edit-line edit-added bg-emerald-950/40 text-emerald-300">${escapeHtml(line)}</span>`;
    }
    if (line.startsWith("-")) {
      return `<span class="edit-line edit-removed bg-red-950/40 text-red-300">${escapeHtml(line)}</span>`;
    }
    if (line.startsWith("@@")) {
      return `<span class="edit-line edit-hunk text-neutral-500">${escapeHtml(line)}</span>`;
    }
    return `<span class="edit-line edit-context text-neutral-400">${escapeHtml(line)}</span>`;
  }).join("\n");

  const toggle = isLong
    ? `<button type="button" class="edit-expand-btn" data-action="expand-edit" data-card-id="${escapeAttr(card.id)}">Show full diff (${diffLines.length} lines)</button>`
    : "";

  return `<div class="file-edit-card flex flex-col gap-1">
    <div class="edit-meta flex items-center gap-2 text-[11px]">
      <span class="edit-filepath font-mono text-neutral-300">${escapeHtml(filePath)}</span>
      <span class="edit-added-count text-emerald-400">+${linesAdded}</span>
      <span class="edit-removed-count text-red-400">-${linesRemoved}</span>
    </div>
    <pre class="edit-diff font-mono text-xs bg-neutral-950 rounded border border-neutral-800 px-3 py-2 overflow-x-auto ${isLong ? "edit-collapsed" : ""}" ${isLong ? 'data-collapsed="true"' : ""}>${highlighted}</pre>
    ${toggle}
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
