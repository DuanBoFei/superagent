import type { DiffHunk } from "../../../types/diff";
import { createVirtualScroll } from "../../../hooks/use-virtual-scroll";

export interface VirtualScrollRenderOptions {
  hunks: DiffHunk[];
  lineHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}

export function computeDiffVirtualScroll(
  hunks: DiffHunk[],
  options: VirtualScrollRenderOptions,
) {
  const totalLines = hunks.reduce(
    (sum, h) => sum + h.lines.length,
    0,
  );
  const threshold = 500;

  if (totalLines <= threshold) {
    return {
      enabled: false,
      totalHeight: totalLines * options.lineHeight,
      visibleHunks: hunks,
      topPadding: 0,
      bottomPadding: 0,
    };
  }

  const vs = createVirtualScroll({
    itemCount: totalLines,
    itemHeight: options.lineHeight,
    viewportHeight: options.viewportHeight,
    scrollTop: options.scrollTop,
    overscan: options.overscan ?? 5,
  });

  const visibleHunks = extractVisibleHunks(hunks, vs.startIndex, vs.endIndex);

  return {
    enabled: true,
    totalHeight: vs.totalHeight,
    visibleHunks,
    topPadding: vs.topPadding,
    bottomPadding: vs.bottomPadding,
    startIndex: vs.startIndex,
    endIndex: vs.endIndex,
  };
}

function extractVisibleHunks(
  hunks: DiffHunk[],
  startLine: number,
  endLine: number,
): DiffHunk[] {
  let lineCounter = 0;
  const result: DiffHunk[] = [];

  for (const hunk of hunks) {
    const hunkStart = lineCounter;
    const hunkEnd = lineCounter + hunk.lines.length;

    if (hunkEnd > startLine && hunkStart < endLine) {
      let lines = hunk.lines;

      // Partial hunk at start - trim leading lines
      if (hunkStart < startLine) {
        const trimCount = startLine - hunkStart;
        lines = lines.slice(trimCount);
      }

      // Partial hunk at end - trim trailing lines
      if (hunkEnd > endLine) {
        const trimCount = hunkEnd - endLine;
        lines = lines.slice(0, lines.length - trimCount);
      }

      result.push({ ...hunk, lines });
    }

    lineCounter = hunkEnd;
  }

  return result;
}
