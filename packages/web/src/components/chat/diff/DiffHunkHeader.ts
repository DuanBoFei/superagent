import type { DiffHunk } from "../../../types/diff";

export function renderDiffHunkHeader(
  hunk: DiffHunk,
  collapsed: boolean,
  collapsible = true,
): string {
  const range = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;

  if (!collapsible) {
    return `<div class="diff-hunk-header bg-neutral-900 border-y border-neutral-800 px-3 py-1 font-mono text-xs text-neutral-500">
      <span class="diff-hunk-range">${range}</span>
    </div>`;
  }

  if (collapsed) {
    return `<button type="button" class="diff-hunk-header diff-hunk-collapsed w-full flex items-center gap-2 bg-neutral-900 border-y border-neutral-800 px-3 py-1 font-mono text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer" data-action="expand-hunk" data-hunk-index="${hunk.hunkIndex}">
      <svg class="diff-hunk-chevron w-3 h-3 text-neutral-500 rotate-90" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 4l4 4-4 4"/>
      </svg>
      <span class="diff-hunk-range">${range}</span>
      <span class="diff-hunk-collapsed-info text-neutral-600 ml-auto">${hunk.lines.length} lines hidden</span>
    </button>`;
  }

  return `<button type="button" class="diff-hunk-header w-full flex items-center gap-2 bg-neutral-900 border-y border-neutral-800 px-3 py-1 font-mono text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer" data-action="collapse-hunk" data-hunk-index="${hunk.hunkIndex}">
    <svg class="diff-hunk-chevron w-3 h-3 text-neutral-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 4l4 4-4 4"/>
    </svg>
    <span class="diff-hunk-range">${range}</span>
  </button>`;
}
