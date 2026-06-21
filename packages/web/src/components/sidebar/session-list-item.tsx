"use client";

import type { SessionSummary } from "../../types/session-history";

export interface SessionListItemProps {
  session: SessionSummary;
  isActive?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onDelete?: (id: string) => void;
  onToggleSelect?: (id: string) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-blue-500";
    case "error":
      return "bg-red-500";
    case "completed":
    default:
      return "bg-emerald-500";
  }
}

export function SessionListItem({
  session,
  isActive = false,
  isSelected = false,
  onSelect,
  onDelete,
  onToggleSelect,
}: SessionListItemProps) {
  return (
    <div
      className={`session-item group relative flex flex-col px-3 py-2.5 cursor-pointer border-l-2 border-l-transparent hover:bg-zinc-900/70 transition-colors duration-100 motion-reduce:transition-none ${
        isActive ? "bg-zinc-900 border-l-emerald-500" : ""
      }`}
      data-session-id={session.id}
      role="option"
      aria-selected={isActive}
      aria-label={`Session: ${session.title}`}
      tabIndex={0}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusClass(session.status)}`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-zinc-200 truncate">
              {session.title}
            </span>
            {session.forkedFrom && (
              <span
                className="ml-1 text-zinc-400"
                title="Forked from another session"
                aria-label="Forked session"
              >
                &#x2387;
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 overflow-hidden">
            {session.firstMessagePreview}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="checkbox"
            className={`multi-select checkbox opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? "opacity-100" : ""}`}
            checked={isSelected}
            onChange={() => onToggleSelect?.(session.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select session"
            tabIndex={-1}
          />
          <button
            type="button"
            className="session-delete-btn opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-400 p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(session.id);
            }}
            aria-label="Delete session"
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="text-[11px] font-mono text-zinc-400">{formatDuration(session.durationMs)}</span>
        <span className="text-[11px] font-mono text-zinc-400">
          {session.toolCallCount} tool{session.toolCallCount !== 1 ? "s" : ""}
        </span>
        <span className="text-[11px] font-mono text-zinc-400">{session.messageCount} msg</span>
      </div>
      {session.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {session.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-800/50 rounded border border-zinc-700/50"
            >
              {tag}
            </span>
          ))}
          {session.tags.length > 3 && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              +{session.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
