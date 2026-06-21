import React from "react";
import type { SubAgentGridCard as SubAgentGridCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

interface SubAgentGridCardProps {
  card: SubAgentGridCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function SubAgentGridCard({ card, onToggle, onCopy }: SubAgentGridCardProps) {
  const { cells, columns } = card.content;
  const colClass = columns === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="sub-agent-grid-card flex flex-col gap-1">
        <div className={`sub-agent-grid grid ${colClass} gap-2`}>
          {cells.map((cell) => (
            <div
              key={cell.agentId}
              className={`sub-agent-cell rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 ${cellStyle(cell.status)}`}
            >
              <div className="cell-header flex items-center gap-1.5">
                <span className="cell-status-icon text-xs">{statusDot(cell.status)}</span>
                <span className="cell-title text-xs font-medium text-neutral-300">{cell.title}</span>
                {cell.status === "running" && (
                  <span className="cell-progress-text text-[10px] text-neutral-600 ml-auto">{cell.progress}%</span>
                )}
              </div>
              {cell.output && (
                <pre className="cell-output font-mono text-[11px] text-neutral-400 mt-1.5 whitespace-pre-wrap overflow-x-auto max-h-24 overflow-y-auto">
                  {cell.output}
                </pre>
              )}
              {cell.status === "running" && cell.progress > 0 && (
                <div className="cell-progress-bar h-1 bg-neutral-800 rounded-full overflow-hidden mt-1">
                  <div className="cell-progress-fill h-full bg-blue-500 rounded-full" style={{ width: `${cell.progress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  );
}

function statusDot(status: string): React.ReactNode {
  switch (status) {
    case "running": return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />;
    case "success": return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />;
    case "error": return <span className="inline-block w-2 h-2 rounded-full bg-red-400" />;
    default: return <span className="inline-block w-2 h-2 rounded-full bg-neutral-600" />;
  }
}

function cellStyle(status: string): string {
  switch (status) {
    case "running": return "border-l-2 border-l-amber-500";
    case "success": return "border-l-2 border-l-emerald-500";
    case "error": return "border-l-2 border-l-red-500";
    default: return "";
  }
}
