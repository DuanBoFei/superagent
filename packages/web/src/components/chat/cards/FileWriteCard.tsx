import React from "react";
import type { FileWriteCard as FileWriteCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

interface FileWriteCardProps {
  card: FileWriteCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function FileWriteCard({ card, onToggle, onCopy }: FileWriteCardProps) {
  const { filePath, linesWritten, content } = card.content;
  const lines = content.split("\n");

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="file-write-card flex flex-col gap-1">
        <div className="write-meta flex items-center gap-2 text-[11px]">
          <span className="write-badge rounded bg-emerald-900/40 text-emerald-300 px-1.5 py-0.5 text-[10px] uppercase font-medium">
            New
          </span>
          <span className="write-filepath font-mono text-neutral-300">{filePath}</span>
          <span className="write-lines text-neutral-500">{linesWritten} lines</span>
        </div>
        <pre className="write-content font-mono text-xs text-neutral-200 bg-neutral-950 rounded border border-emerald-900/40 px-3 py-2 overflow-x-auto">
          {lines.map((line, i) => (
            <span key={i} className="write-line">
              <span className="write-line-num text-neutral-600 mr-2 select-none">{i + 1}</span>
              <span className="write-line-content">{line}</span>
            </span>
          ))}
        </pre>
      </div>
    </ToolCard>
  );
}
