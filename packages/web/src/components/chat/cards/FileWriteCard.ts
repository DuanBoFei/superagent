import type { FileWriteCard } from "../../../types/cards";

export function renderFileWriteCard(card: FileWriteCard): string {
  const { filePath, linesWritten, content } = card.content;
  const lines = content.split("\n");
  const numberedLines = lines
    .map((line, i) => `<span class="write-line"><span class="write-line-num text-neutral-600 mr-2 select-none">${i + 1}</span><span class="write-line-content">${escapeHtml(line)}</span></span>`)
    .join("\n");

  return `<div class="file-write-card flex flex-col gap-1">
    <div class="write-meta flex items-center gap-2 text-[11px]">
      <span class="write-badge rounded bg-emerald-900/40 text-emerald-300 px-1.5 py-0.5 text-[10px] uppercase font-medium">New</span>
      <span class="write-filepath font-mono text-neutral-300">${escapeHtml(filePath)}</span>
      <span class="write-lines text-neutral-500">${linesWritten} lines</span>
    </div>
    <pre class="write-content font-mono text-xs text-neutral-200 bg-neutral-950 rounded border border-emerald-900/40 px-3 py-2 overflow-x-auto">${numberedLines}</pre>
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
