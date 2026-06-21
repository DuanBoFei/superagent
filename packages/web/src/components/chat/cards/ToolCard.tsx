import React from "react";
import type { BaseCardState, ToolCardType } from "../../../types/cards";

const TYPE_LABELS: Record<ToolCardType, string> = {
  bash: "Bash",
  "file-read": "File Read",
  "file-write": "File Write",
  "file-edit": "File Edit",
  grep: "Grep",
  glob: "Glob",
  "task-list": "Task List",
  "sub-agent-grid": "Sub-Agents",
  "web-search": "Web Search",
};

export interface ToolCardProps {
  card: BaseCardState;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
  children: React.ReactNode;
}

export function ToolCard({ card, onToggle, onCopy, children }: ToolCardProps) {
  const typeLabel = TYPE_LABELS[card.type] ?? card.type;
  const timestamp = new Date(card.timestamp).toISOString().replace("T", " ").slice(0, 19);
  const collapsedClass = card.isExpanded ? "" : " card-collapsed";

  return (
    <div
      className={`card-container rounded border border-neutral-800 bg-neutral-950 shadow-sm${collapsedClass}`}
      data-card-id={card.id}
      data-card-type={card.type}
    >
      <div
        className="card-header flex items-center gap-2 px-3 py-2 border-b border-neutral-800 bg-neutral-950/50"
        data-card-id={card.id}
        data-status={card.status}
      >
        <StatusDot status={card.status} />
        <span className="card-type-label text-[11px] uppercase tracking-wide text-neutral-500 font-medium">
          {typeLabel}
        </span>
        <span className="card-title text-sm text-neutral-200 font-medium truncate flex-1">
          {card.title}
        </span>
        <span className="card-timestamp text-[11px] text-neutral-600 tabular-nums">
          {timestamp}
        </span>
        <button
          type="button"
          className="card-copy-btn text-neutral-500 hover:text-neutral-300"
          onClick={() => onCopy?.(card.id)}
          aria-label="Copy card content"
          title="Copy"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        {card.isCollapsible && (
          <button
            type="button"
            className="card-toggle-btn text-neutral-500 hover:text-neutral-300"
            onClick={() => onToggle?.(card.id)}
            aria-expanded={card.isExpanded ? "true" : "false"}
            aria-label={card.isExpanded ? "Collapse card" : "Expand card"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`card-toggle-icon transition-transform ${card.isExpanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>
      {card.isExpanded && (
        <div className="card-body px-3 py-2 text-sm text-neutral-200">
          {children}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-neutral-500",
    running: "bg-amber-400 animate-pulse",
    success: "bg-emerald-400",
    error: "bg-red-400",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    running: "Running",
    success: "Success",
    error: "Error",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? "bg-neutral-600"}`}
      role="img"
      aria-label={labels[status] ?? status}
    />
  );
}
