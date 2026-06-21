import type { DiffHunk } from "../../../types/diff";

interface DiffHunkHeaderProps {
  hunk: DiffHunk;
  collapsed: boolean;
  collapsible?: boolean;
  onToggle: (hunkIndex: number) => void;
}

export function DiffHunkHeader({ hunk, collapsed, collapsible = true, onToggle }: DiffHunkHeaderProps) {
  const range = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;

  if (!collapsible) {
    return (
      <div className="diff-hunk-header bg-neutral-900 border-y border-neutral-800 px-3 py-1 font-mono text-xs text-neutral-500">
        <span className="diff-hunk-range">{range}</span>
      </div>
    );
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className="diff-hunk-header diff-hunk-collapsed w-full flex items-center gap-2 bg-neutral-900 border-y border-neutral-800 px-3 py-1 font-mono text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer"
        onClick={() => onToggle(hunk.hunkIndex)}
      >
        <svg className="diff-hunk-chevron w-3 h-3 text-neutral-500 rotate-90" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4l4 4-4 4" />
        </svg>
        <span className="diff-hunk-range">{range}</span>
        <span className="diff-hunk-collapsed-info text-neutral-600 ml-auto">{hunk.lines.length} lines hidden</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="diff-hunk-header w-full flex items-center gap-2 bg-neutral-900 border-y border-neutral-800 px-3 py-1 font-mono text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer"
      onClick={() => onToggle(hunk.hunkIndex)}
    >
      <svg className="diff-hunk-chevron w-3 h-3 text-neutral-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4l4 4-4 4" />
      </svg>
      <span className="diff-hunk-range">{range}</span>
    </button>
  );
}
