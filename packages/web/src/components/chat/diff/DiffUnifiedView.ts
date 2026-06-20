import type { DiffHunk } from "../../../types/diff";
import { renderDiffLine } from "./DiffLine";
import { renderDiffHunkHeader } from "./DiffHunkHeader";

export interface UnifiedViewOptions {
  language?: string;
  showCharHighlighting?: boolean;
  collapsibleHunks?: boolean;
}

export function renderDiffUnifiedView(
  hunks: DiffHunk[],
  collapsedHunks: Set<number>,
  options: UnifiedViewOptions = {},
): string {
  if (hunks.length === 0) {
    return `<div class="diff-unified-empty text-neutral-500 text-sm py-4 text-center">No changes</div>`;
  }

  const sections = hunks.map((hunk) => {
    const isCollapsed = collapsedHunks.has(hunk.hunkIndex);
    const collapsible = options.collapsibleHunks !== false;
    const header = renderDiffHunkHeader(hunk, isCollapsed, collapsible);

    if (isCollapsed) {
      return header;
    }

    const linesHtml = hunk.lines
      .map((line) =>
        renderDiffLine(line, {
          language: options.language,
          showCharHighlighting: options.showCharHighlighting,
        }),
      )
      .join("\n");

    return `${header}\n${linesHtml}`;
  });

  return `<div class="diff-unified-view font-mono text-xs">
    ${sections.join("\n")}
  </div>`;
}
