import type { DiffHunk } from "../../../types/diff";

export function renderDiffGutterIndicators(
  hunks: DiffHunk[],
  totalLines: number,
): string {
  if (hunks.length === 0 || totalLines === 0) {
    return "";
  }

  const markers = hunks
    .filter((h) => h.lines.some((l) => l.type === "add" || l.type === "delete" || l.type === "modify"))
    .map((hunk) => {
      const firstLine = hunk.lines[0];
      const positionPercent = ((firstLine?.oldLineNumber ?? hunk.oldStart) / totalLines) * 100;

      const hasAdd = hunk.lines.some((l) => l.type === "add");
      const hasDelete = hunk.lines.some((l) => l.type === "delete");

      let color = "bg-amber-500";
      if (hasAdd && !hasDelete) color = "bg-emerald-500";
      else if (hasDelete && !hasAdd) color = "bg-red-500";

      return `<button type="button"
        class="diff-gutter-marker absolute right-0 w-1 h-1 ${color} rounded-full opacity-70 hover:opacity-100 hover:w-1.5 transition-all cursor-pointer"
        style="top:${positionPercent}%"
        data-action="scroll-to-hunk"
        data-hunk-index="${hunk.hunkIndex}"
        title="Change ${hunk.hunkIndex + 1} (line ${hunk.oldStart})"
        aria-label="Jump to change ${hunk.hunkIndex + 1}"
      ></button>`;
    })
    .join("\n");

  return `<div class="diff-gutter-indicators absolute right-0 top-0 bottom-0 w-3 pointer-events-none" aria-hidden="true">
    <div class="relative h-full pointer-events-auto">
      ${markers}
    </div>
  </div>`;
}
