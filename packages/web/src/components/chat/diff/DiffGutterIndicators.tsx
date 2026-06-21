import type { DiffHunk } from "../../../types/diff";

interface DiffGutterIndicatorsProps {
  hunks: DiffHunk[];
  totalLines: number;
  onScrollToHunk: (hunkIndex: number) => void;
}

export function DiffGutterIndicators({ hunks, totalLines, onScrollToHunk }: DiffGutterIndicatorsProps) {
  if (hunks.length === 0 || totalLines === 0) {
    return null;
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-3 pointer-events-none" aria-hidden="true">
      <div className="relative h-full pointer-events-auto">
        {hunks
          .filter((h) => h.lines.some((l) => l.type === "add" || l.type === "delete" || l.type === "modify"))
          .map((hunk) => {
            const firstLine = hunk.lines[0];
            const positionPercent = ((firstLine?.oldLineNumber ?? hunk.oldStart) / totalLines) * 100;

            const hasAdd = hunk.lines.some((l) => l.type === "add");
            const hasDelete = hunk.lines.some((l) => l.type === "delete");

            let color = "bg-amber-500";
            if (hasAdd && !hasDelete) color = "bg-emerald-500";
            else if (hasDelete && !hasAdd) color = "bg-red-500";

            return (
              <button
                key={hunk.hunkIndex}
                type="button"
                className={`diff-gutter-marker absolute right-0 w-1 h-1 ${color} rounded-full opacity-70 hover:opacity-100 hover:w-1.5 transition-all cursor-pointer`}
                style={{ top: `${positionPercent}%` }}
                onClick={() => onScrollToHunk(hunk.hunkIndex)}
                title={`Change ${hunk.hunkIndex + 1} (line ${hunk.oldStart})`}
                aria-label={`Jump to change ${hunk.hunkIndex + 1}`}
              />
            );
          })}
      </div>
    </div>
  );
}
