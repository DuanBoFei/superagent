import type { FileReadCard } from "../../../types/cards";

const AUTO_COLLAPSE_LINES = 50;

export function renderFileReadCard(card: FileReadCard): string {
  const { filePath, fileSize, lineCount, content, language } = card.content;
  const lines = content.split("\n");
  const isLong = lines.length > AUTO_COLLAPSE_LINES;
  const displayLines = isLong ? lines.slice(0, 10) : lines;

  const numberedLines = displayLines
    .map((line, i) => `<span class="read-line"><span class="read-line-num text-neutral-600 mr-2 select-none">${i + 1}</span><span class="read-line-content">${escapeHtml(line)}</span></span>`)
    .join("\n");

  const toggle = isLong
    ? `<button type="button" class="read-expand-btn" data-action="expand-read" data-card-id="${escapeAttr(card.id)}">Show all ${lineCount} lines</button>`
    : "";

  return `<div class="file-read-card flex flex-col gap-1">
    <div class="read-meta flex items-center gap-2 text-[11px] text-neutral-500">
      <span class="read-filepath font-mono text-neutral-300">${escapeHtml(filePath)}</span>
      <span class="read-size">${formatSize(fileSize)}</span>
      <span class="read-lines">${lineCount} lines</span>
      <span class="read-lang text-neutral-500 uppercase">${escapeHtml(language)}</span>
    </div>
    <pre class="read-content font-mono text-xs text-neutral-200 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 overflow-x-auto ${isLong ? "read-collapsed" : ""}" ${isLong ? 'data-collapsed="true"' : ""}>${numberedLines}</pre>
    ${toggle}
  </div>`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
