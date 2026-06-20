import type { DiffHunk } from "../types/diff";
import { computeDiffVirtualScroll } from "../components/chat/diff/DiffVirtualScroll";

export interface UseDiffVirtualScrollOptions {
  hunks: DiffHunk[];
  collapsedHunks: Set<number>;
  lineHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}

export function useDiffVirtualScroll(options: UseDiffVirtualScrollOptions) {
  const { hunks, collapsedHunks, lineHeight, viewportHeight, scrollTop } = options;

  // Calculate effective line count accounting for collapsed hunks
  const effectiveHunks = hunks.map((hunk) => {
    if (collapsedHunks.has(hunk.hunkIndex)) {
      return { ...hunk, lines: [hunk.lines[0]] }; // Collapsed = 1 line for header
    }
    return hunk;
  });

  return computeDiffVirtualScroll(effectiveHunks, {
    hunks: effectiveHunks,
    lineHeight,
    viewportHeight,
    scrollTop,
    overscan: options.overscan,
  });
}

export function scrollToHunk(
  hunks: DiffHunk[],
  collapsedHunks: Set<number>,
  hunkIndex: number,
  lineHeight: number,
): number {
  let scrollTop = 0;

  for (const hunk of hunks) {
    if (hunk.hunkIndex === hunkIndex) {
      break;
    }
    if (collapsedHunks.has(hunk.hunkIndex)) {
      scrollTop += lineHeight;
    } else {
      scrollTop += hunk.lines.length * lineHeight;
    }
  }

  return scrollTop;
}

export function renderExpandAllButton(
  contextHunkCount: number,
): string {
  if (contextHunkCount === 0) {
    return "";
  }

  return `<button type="button"
    class="diff-expand-all px-3 py-1 text-xs font-mono rounded border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
    data-action="expand-all-context"
  >
    Expand all ${contextHunkCount} hidden context ${contextHunkCount === 1 ? "section" : "sections"}
  </button>`;
}
