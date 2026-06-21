import type { DiffHunk } from "../../../types/diff";
import { DiffLine } from "./DiffLine";
import { DiffHunkHeader } from "./DiffHunkHeader";

interface DiffUnifiedViewProps {
  hunks: DiffHunk[];
  collapsedHunks: Set<number>;
  language?: string;
  showCharHighlighting?: boolean;
  collapsibleHunks?: boolean;
  onToggleHunk: (hunkIndex: number) => void;
}

export function DiffUnifiedView({ hunks, collapsedHunks, language, showCharHighlighting, collapsibleHunks = true, onToggleHunk }: DiffUnifiedViewProps) {
  if (hunks.length === 0) {
    return <div className="diff-unified-empty text-neutral-500 text-sm py-4 text-center">No changes</div>;
  }

  return (
    <div className="diff-unified-view font-mono text-xs">
      {hunks.map((hunk) => {
        const isCollapsed = collapsedHunks.has(hunk.hunkIndex);

        if (isCollapsed) {
          return (
            <DiffHunkHeader
              key={hunk.hunkIndex}
              hunk={hunk}
              collapsed={true}
              collapsible={collapsibleHunks}
              onToggle={onToggleHunk}
            />
          );
        }

        return (
          <div key={hunk.hunkIndex}>
            <DiffHunkHeader
              hunk={hunk}
              collapsed={false}
              collapsible={collapsibleHunks}
              onToggle={onToggleHunk}
            />
            {hunk.lines.map((line, i) => (
              <DiffLine
                key={i}
                line={line}
                language={language}
                showCharHighlighting={showCharHighlighting}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
