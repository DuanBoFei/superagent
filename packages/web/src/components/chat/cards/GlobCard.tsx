import React, { useState } from "react";
import type { GlobCard as GlobCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

const AUTO_COLLAPSE_FILES = 30;

interface GlobCardProps {
  card: GlobCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function GlobCard({ card, onToggle, onCopy }: GlobCardProps) {
  const { pattern, files, totalFiles } = card.content;
  const isLong = files.length > AUTO_COLLAPSE_FILES;
  const [expanded, setExpanded] = useState(false);
  const displayFiles = isLong && !expanded ? files.slice(0, 10) : files;

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="glob-card flex flex-col gap-1">
        <div className="glob-meta flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="glob-pattern font-mono text-neutral-300">{pattern}</span>
          <span className="glob-total">{totalFiles} file{totalFiles !== 1 ? "s" : ""}</span>
        </div>
        <div className={`glob-results flex flex-col gap-1 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 ${isLong && !expanded ? "glob-collapsed" : ""}`}>
          {displayFiles.map((f) => (
            <span key={f} className="glob-row flex items-center gap-2">
              <span className="glob-icon text-neutral-600 text-xs">
                {f.endsWith("/") ? "📁" : "📄"}
              </span>
              <span className="glob-filename font-mono text-xs text-neutral-300">{f}</span>
            </span>
          ))}
        </div>
        {isLong && (
          <button
            type="button"
            className="glob-expand-btn text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : `Show all ${totalFiles} files`}
          </button>
        )}
      </div>
    </ToolCard>
  );
}
