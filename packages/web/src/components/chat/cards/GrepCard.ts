import type { GrepCard, GrepMatch } from "../../../types/cards";

const AUTO_COLLAPSE_MATCHES = 20;

export function renderGrepCard(card: GrepCard): string {
  const { pattern, matches, totalMatches, filesSearched } = card.content;
  const isLong = matches.length > AUTO_COLLAPSE_MATCHES;
  const displayMatches = isLong ? matches.slice(0, 10) : matches;

  // Group by file
  const groups = new Map<string, GrepMatch[]>();
  for (const m of displayMatches) {
    const list = groups.get(m.filePath) ?? [];
    list.push(m);
    groups.set(m.filePath, list);
  }

  const groupHtml = Array.from(groups.entries()).map(([filePath, ms]) => {
    const matchRows = ms.map((m) => {
      const prefix = escapeHtml(m.contextBefore);
      const match = `<span class="grep-match-text text-amber-300 font-bold">${escapeHtml(m.matchText)}</span>`;
      const suffix = escapeHtml(m.contextAfter);
      return `<span class="grep-row flex items-baseline gap-2">
        <span class="grep-line-num text-neutral-600 w-8 text-right select-none">${m.line}</span>
        <span class="grep-row-content font-mono text-xs">${prefix}${match}${suffix}</span>
      </span>`;
    }).join("\n");

    return `<div class="grep-file-group">
      <div class="grep-filepath font-mono text-xs text-neutral-300 mb-1">${escapeHtml(filePath)}</div>
      ${matchRows}
    </div>`;
  }).join("\n");

  const toggle = isLong
    ? `<button type="button" class="grep-expand-btn" data-action="expand-grep" data-card-id="${escapeAttr(card.id)}">Show all ${totalMatches} matches</button>`
    : "";

  return `<div class="grep-card flex flex-col gap-1">
    <div class="grep-meta flex items-center gap-2 text-[11px] text-neutral-500">
      <span class="grep-pattern font-mono text-neutral-300">/${escapeHtml(pattern)}/</span>
      <span class="grep-total">${totalMatches} match${totalMatches !== 1 ? "es" : ""}</span>
      <span class="grep-files">in ${filesSearched} file${filesSearched !== 1 ? "s" : ""}</span>
    </div>
    <div class="grep-results flex flex-col gap-2 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 overflow-x-auto ${isLong ? "grep-collapsed" : ""}">
      ${groupHtml}
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
