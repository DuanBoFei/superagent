import React, { useState } from "react";
import type { FileEditCard as FileEditCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

const AUTO_COLLAPSE_DIFF_LINES = 100;

interface FileEditCardProps {
  card: FileEditCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function FileEditCard({ card, onToggle, onCopy }: FileEditCardProps) {
  const { filePath, diff, linesAdded, linesRemoved } = card.content;
  const diffLines = (diff ?? "").split("\n");
  const isLong = diffLines.length > AUTO_COLLAPSE_DIFF_LINES;
  const [expanded, setExpanded] = useState(false);
  const displayLines = isLong && !expanded ? diffLines.slice(0, 20) : diffLines;

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="file-edit-card flex flex-col gap-1">
        <div className="edit-meta flex items-center gap-2 text-[11px] px-0 pt-0">
          <span className="edit-filepath font-mono text-neutral-300">{filePath}</span>
          <span className="edit-added-count text-emerald-400">+{linesAdded}</span>
          <span className="edit-removed-count text-red-400">-{linesRemoved}</span>
        </div>
        <pre className={`edit-diff font-mono text-xs bg-neutral-950 rounded border border-neutral-800 px-3 py-2 overflow-x-auto ${isLong && !expanded ? "edit-collapsed" : ""}`}>
          {displayLines.map((line, i) => {
            let className = "edit-line edit-context text-neutral-400";
            if (line.startsWith("+")) className = "edit-line edit-added bg-emerald-950/40 text-emerald-300";
            else if (line.startsWith("-")) className = "edit-line edit-removed bg-red-950/40 text-red-300";
            else if (line.startsWith("@@")) className = "edit-line edit-hunk text-neutral-500";
            return <span key={i} className={className}>{line}{"\n"}</span>;
          })}
        </pre>
        {isLong && (
          <button
            type="button"
            className="edit-expand-btn text-xs text-neutral-400 hover:text-neutral-200"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : `Show full diff (${diffLines.length} lines)`}
          </button>
        )}
      </div>
    </ToolCard>
  );
}
