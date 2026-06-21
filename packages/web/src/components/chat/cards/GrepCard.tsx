import React, { useState } from "react";
import type { GrepCard as GrepCardType, GrepMatch } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

const AUTO_COLLAPSE_MATCHES = 20;

interface GrepCardProps {
  card: GrepCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function GrepCard({ card, onToggle, onCopy }: GrepCardProps) {
  const { pattern, matches, totalMatches, filesSearched } = card.content;
  const isLong = matches.length > AUTO_COLLAPSE_MATCHES;
  const [expanded, setExpanded] = useState(false);
  const displayMatches = isLong && !expanded ? matches.slice(0, 10) : matches;

  const groups = new Map<string, GrepMatch[]>();
  for (const m of displayMatches) {
    const list = groups.get(m.filePath) ?? [];
    list.push(m);
    groups.set(m.filePath, list);
  }

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="grep-card flex flex-col gap-1">
        <div className="grep-meta flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="grep-pattern font-mono text-neutral-300">/{pattern}/</span>
          <span className="grep-total">{totalMatches} match{totalMatches !== 1 ? "es" : ""}</span>
          <span className="grep-files">in {filesSearched} file{filesSearched !== 1 ? "s" : ""}</span>
        </div>
        <div className={`grep-results flex flex-col gap-2 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 overflow-x-auto ${isLong && !expanded ? "grep-collapsed" : ""}`}>
          {Array.from(groups.entries()).map(([filePath, ms]) => (
            <div key={filePath} className="grep-file-group">
              <div className="grep-filepath font-mono text-xs text-neutral-300 mb-1">{filePath}</div>
              {ms.map((m) => (
                <span key={`${m.filePath}:${m.line}:${m.column}`} className="grep-row flex items-baseline gap-2">
                  <span className="grep-line-num text-neutral-600 w-8 text-right select-none">{m.line}</span>
                  <span className="grep-row-content font-mono text-xs">
                    {m.contextBefore}
                    <span className="grep-match-text text-amber-300 font-bold">{m.matchText}</span>
                    {m.contextAfter}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
        {isLong && (
          <button
            type="button"
            className="grep-expand-btn text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : `Show all ${totalMatches} matches`}
          </button>
        )}
      </div>
    </ToolCard>
  );
}
