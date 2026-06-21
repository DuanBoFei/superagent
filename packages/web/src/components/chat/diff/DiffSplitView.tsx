import type { DiffHunk } from "../../../types/diff";
import { DiffLine } from "./DiffLine";
import { DiffHunkHeader } from "./DiffHunkHeader";

interface DiffSplitViewProps {
  hunks: DiffHunk[];
  collapsedHunks: Set<number>;
  language?: string;
  showCharHighlighting?: boolean;
  collapsibleHunks?: boolean;
  onToggleHunk: (hunkIndex: number) => void;
}

function EmptyPlaceholder() {
  return (
    <div className="diff-line diff-line-empty flex items-start font-mono text-xs leading-5 min-h-[20px] bg-neutral-950/50 text-neutral-600">
      <span className="diff-line-num w-12 inline-block text-right pr-3" />
      <span className="diff-line-content flex-1" />
    </div>
  );
}

export function DiffSplitView({ hunks, collapsedHunks, language, showCharHighlighting, collapsibleHunks = true, onToggleHunk }: DiffSplitViewProps) {
  if (hunks.length === 0) {
    return <div className="diff-split-empty text-neutral-500 text-sm py-4 text-center">No changes</div>;
  }

  return (
    <div className="diff-split-view font-mono text-xs">
      {hunks.map((hunk) => {
        const isCollapsed = collapsedHunks.has(hunk.hunkIndex);

        if (isCollapsed) {
          return (
            <div key={hunk.hunkIndex} className="diff-split-header col-span-2">
              <DiffHunkHeader hunk={hunk} collapsed={true} collapsible={collapsibleHunks} onToggle={onToggleHunk} />
            </div>
          );
        }

        const leftLines: React.ReactNode[] = [];
        const rightLines: React.ReactNode[] = [];

        for (let i = 0; i < hunk.lines.length; i++) {
          const line = hunk.lines[i];
          switch (line.type) {
            case "context":
            case "modify": {
              leftLines.push(
                <DiffLine key={`left-${i}`} line={{ ...line, type: "context" }} language={language} />,
              );
              rightLines.push(
                <DiffLine key={`right-${i}`} line={{ ...line, type: "context" }} language={language} />,
              );
              break;
            }
            case "delete": {
              leftLines.push(
                <DiffLine key={`left-${i}`} line={{ ...line, type: "delete" }} language={language} showCharHighlighting={showCharHighlighting} />,
              );
              rightLines.push(<EmptyPlaceholder key={`right-${i}`} />);
              break;
            }
            case "add": {
              leftLines.push(<EmptyPlaceholder key={`left-${i}`} />);
              rightLines.push(
                <DiffLine key={`right-${i}`} line={{ ...line, type: "add" }} language={language} showCharHighlighting={showCharHighlighting} />,
              );
              break;
            }
            case "empty": {
              leftLines.push(<EmptyPlaceholder key={`left-${i}`} />);
              rightLines.push(<EmptyPlaceholder key={`right-${i}`} />);
              break;
            }
          }
        }

        return (
          <div key={hunk.hunkIndex}>
            <div className="diff-split-header col-span-2">
              <DiffHunkHeader hunk={hunk} collapsed={false} collapsible={collapsibleHunks} onToggle={onToggleHunk} />
            </div>
            <div className="diff-split-hunk grid grid-cols-2 gap-x-1">
              <div className="diff-split-left border-r border-neutral-800">{leftLines}</div>
              <div className="diff-split-right">{rightLines}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
