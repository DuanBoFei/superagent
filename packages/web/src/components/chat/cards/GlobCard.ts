import type { GlobCard } from "../../../types/cards";

const AUTO_COLLAPSE_FILES = 30;

export function renderGlobCard(card: GlobCard): string {
  const { pattern, files, totalFiles } = card.content;
  const isLong = files.length > AUTO_COLLAPSE_FILES;
  const displayFiles = isLong ? files.slice(0, 10) : files;

  const fileRows = displayFiles.map((f) => {
    const icon = f.endsWith("/") ? "folder" : "file";
    const iconChar = icon === "folder" ? "&#128193;" : "&#128196;";
    return `<span class="glob-row flex items-center gap-2">
      <span class="glob-icon text-neutral-600 text-xs">${iconChar}</span>
      <span class="glob-filename font-mono text-xs text-neutral-300">${escapeHtml(f)}</span>
    </span>`;
  }).join("\n");

  const toggle = isLong
    ? `<button type="button" class="glob-expand-btn" data-action="expand-glob" data-card-id="${escapeAttr(card.id)}">Show all ${totalFiles} files</button>`
    : "";

  return `<div class="glob-card flex flex-col gap-1">
    <div class="glob-meta flex items-center gap-2 text-[11px] text-neutral-500">
      <span class="glob-pattern font-mono text-neutral-300">${escapeHtml(pattern)}</span>
      <span class="glob-total">${totalFiles} file${totalFiles !== 1 ? "s" : ""}</span>
    </div>
    <div class="glob-results flex flex-col gap-1 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 ${isLong ? "glob-collapsed" : ""}">
      ${fileRows}
    </div>
    ${toggle}
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
