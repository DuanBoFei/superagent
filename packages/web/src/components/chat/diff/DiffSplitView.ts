import type { DiffHunk } from "../../../types/diff";
import { renderDiffLine } from "./DiffLine";
import { renderDiffHunkHeader } from "./DiffHunkHeader";

export interface SplitViewOptions {
  language?: string;
  showCharHighlighting?: boolean;
  collapsibleHunks?: boolean;
}

export function renderDiffSplitView(
  hunks: DiffHunk[],
  collapsedHunks: Set<number>,
  options: SplitViewOptions = {},
): string {
  if (hunks.length === 0) {
    return `<div class="diff-split-empty text-neutral-500 text-sm py-4 text-center">No changes</div>`;
  }

  const sections = hunks.map((hunk) => {
    const isCollapsed = collapsedHunks.has(hunk.hunkIndex);
    const collapsible = options.collapsibleHunks !== false;

    // Hunk header spans both columns
    const header = `<div class="diff-split-header col-span-2">${renderDiffHunkHeader(hunk, isCollapsed, collapsible)}</div>`;

    if (isCollapsed) {
      return header;
    }

    const leftLines: string[] = [];
    const rightLines: string[] = [];

    for (const line of hunk.lines) {
      switch (line.type) {
        case "context":
        case "modify": {
          // Show on both sides
          leftLines.push(
            renderDiffLine(
              { ...line, type: "context" },
              { language: options.language },
            ),
          );
          rightLines.push(
            renderDiffLine(
              { ...line, type: "context" },
              { language: options.language },
            ),
          );
          break;
        }
        case "delete": {
          const deleteLine = renderDiffLine(
            { ...line, type: "delete" },
            { language: options.language, showCharHighlighting: options.showCharHighlighting },
          );
          leftLines.push(deleteLine);
          rightLines.push(renderEmptyPlaceholder());
          break;
        }
        case "add": {
          const addLine = renderDiffLine(
            { ...line, type: "add" },
            { language: options.language, showCharHighlighting: options.showCharHighlighting },
          );
          leftLines.push(renderEmptyPlaceholder());
          rightLines.push(addLine);
          break;
        }
        case "empty": {
          leftLines.push(renderEmptyPlaceholder());
          rightLines.push(renderEmptyPlaceholder());
          break;
        }
      }
    }

    return `${header}
      <div class="diff-split-hunk grid grid-cols-2 gap-x-1">
        <div class="diff-split-left border-r border-neutral-800">${leftLines.join("\n")}</div>
        <div class="diff-split-right">${rightLines.join("\n")}</div>
      </div>`;
  });

  return `<div class="diff-split-view font-mono text-xs">
    ${sections.join("\n")}
  </div>`;
}

function renderEmptyPlaceholder(): string {
  return `<div class="diff-line diff-line-empty flex items-start font-mono text-xs leading-5 min-h-[20px] bg-neutral-950/50 text-neutral-600">
    <span class="diff-line-num w-12 inline-block text-right pr-3"></span>
    <span class="diff-line-content flex-1"></span>
  </div>`;
}
