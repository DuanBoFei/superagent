import React, { useState } from "react";
import type { FileReadCard as FileReadCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

const AUTO_COLLAPSE_LINES = 50;

interface FileReadCardProps {
  card: FileReadCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function FileReadCard({ card, onToggle, onCopy }: FileReadCardProps) {
  const { filePath, fileSize, lineCount, content, language } = card.content;
  const lines = content.split("\n");
  const isLong = lines.length > AUTO_COLLAPSE_LINES;
  const [expanded, setExpanded] = useState(false);
  const displayLines = isLong && !expanded ? lines.slice(0, 10) : lines;

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="file-read-card flex flex-col gap-1">
        <div className="read-meta flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="read-filepath font-mono text-neutral-300">{filePath}</span>
          <span className="read-size">{formatSize(fileSize)}</span>
          <span className="read-lines">{lineCount} lines</span>
          <span className="read-lang text-neutral-500 uppercase">{language}</span>
        </div>
        <pre className={`read-content font-mono text-xs text-neutral-200 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 overflow-x-auto ${isLong && !expanded ? "read-collapsed" : ""}`}>
          {displayLines.map((line, i) => (
            <span key={i} className="read-line">
              <span className="read-line-num text-neutral-600 mr-2 select-none">{i + 1}</span>
              <span className="read-line-content">{line}</span>
            </span>
          ))}
        </pre>
        {isLong && (
          <button
            type="button"
            className="read-expand-btn text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : `Show all ${lineCount} lines`}
          </button>
        )}
      </div>
    </ToolCard>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}
