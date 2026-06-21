"use client";

import { useCallback } from "react";
import type { Session, SessionStatus } from "../../types/session-history";
import type { Message } from "../../types/message";
import type { ToolCardState } from "../../types/cards";

const STATUS_LABELS: Record<SessionStatus, string> = {
  active: "Active",
  completed: "Completed",
  error: "Error",
};

const STATUS_CLASSES: Record<SessionStatus, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  completed: "text-zinc-400 bg-zinc-400/10",
  error: "text-red-400 bg-red-400/10",
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TimelineEntry {
  type: "message" | "tool-call";
  timestamp: number;
  messageIndex?: number;
  message?: Message;
  toolCall?: ToolCardState;
}

function buildTimeline(session: Session): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  session.messages.forEach((msg, idx) => {
    entries.push({
      type: "message",
      timestamp: msg.timestamp,
      messageIndex: idx,
      message: msg,
    });
  });

  session.toolCalls.forEach((tc) => {
    entries.push({
      type: "tool-call",
      timestamp: tc.timestamp,
      toolCall: tc,
    });
  });

  entries.sort((a, b) => a.timestamp - b.timestamp);
  return entries;
}

function ToolCallStatusIcon({ status }: { status: string }) {
  const icon =
    status === "success"
      ? "✓"
      : status === "error"
        ? "✗"
        : status === "running"
          ? "●"
          : "○";
  const cls =
    status === "success"
      ? "text-emerald-400"
      : status === "error"
        ? "text-red-400"
        : status === "running"
          ? "text-amber-400"
          : "text-zinc-500";
  return <span className={`${cls} text-xs`}>{icon}</span>;
}

function ToolCallDetail({ tc }: { tc: ToolCardState }) {
  switch (tc.type) {
    case "bash":
      return (
        <div className="mt-1">
          <span className="text-[11px] text-zinc-500 block">
            Exit code: {tc.content.exitCode}
            {tc.content.durationMs ? ` · ${(tc.content.durationMs / 1000).toFixed(1)}s` : ""}
          </span>
        </div>
      );
    case "file-read":
      return (
        <span className="text-[11px] text-zinc-500">
          {tc.content.filePath} &middot; {tc.content.lineCount} lines &middot; {tc.content.language}
        </span>
      );
    case "file-write":
      return (
        <span className="text-[11px] text-zinc-500">
          {tc.content.filePath} &middot; {tc.content.linesWritten} lines written
        </span>
      );
    case "file-edit":
      return (
        <span className="text-[11px] text-zinc-500">
          {tc.content.filePath} &middot; +{tc.content.linesAdded}/-{tc.content.linesRemoved}
        </span>
      );
    case "grep":
      return (
        <span className="text-[11px] text-zinc-500">
          {tc.content.totalMatches} matches in {tc.content.filesSearched} files
        </span>
      );
    case "glob":
      return (
        <span className="text-[11px] text-zinc-500">{tc.content.totalFiles} files matched</span>
      );
    case "task-list":
      return (
        <span className="text-[11px] text-zinc-500">
          {tc.content.completedCount}/{tc.content.totalCount} tasks
        </span>
      );
    case "sub-agent-grid":
      return (
        <span className="text-[11px] text-zinc-500">{tc.content.cells.length} agents</span>
      );
    case "web-search":
      return (
        <span className="text-[11px] text-zinc-500">
          {tc.content.totalResults} results for "{tc.content.query}"
        </span>
      );
  }
}

export interface SessionDetailPanelProps {
  session: Session;
  maxEntries?: number;
  onFork?: (messageIndex: number) => void;
  onClose?: () => void;
  onTagClick?: (tag: string) => void;
  onLoadMore?: () => void;
}

export function SessionDetailPanel({
  session,
  maxEntries = 50,
  onFork,
  onClose,
  onTagClick,
  onLoadMore,
}: SessionDetailPanelProps) {
  const timeline = buildTimeline(session);
  const hasMore = timeline.length > maxEntries;
  const visible = hasMore ? timeline.slice(0, maxEntries) : timeline;
  const remaining = timeline.length - maxEntries;

  const handleClose = useCallback(() => onClose?.(), [onClose]);
  const handleLoadMore = useCallback(() => onLoadMore?.(), [onLoadMore]);
  const handleFork = useCallback(
    (idx: number) => () => onFork?.(idx),
    [onFork],
  );
  const handleTagClick = useCallback(
    (tag: string) => () => onTagClick?.(tag),
    [onTagClick],
  );

  const hasForkedFrom = session.forkedFrom !== null;

  return (
    <div className="session-detail-panel flex flex-col h-full bg-neutral-950 border-l border-zinc-800 overflow-y-auto">
      {/* Header */}
      <div className="session-detail-header border-b border-zinc-800 px-4 py-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100 truncate">{session.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-zinc-500">{formatTimestamp(session.createdAt)}</span>
              <span className="text-[11px] text-zinc-600">&middot;</span>
              <span className="text-[11px] text-zinc-500">{formatDuration(session.durationMs)}</span>
            </div>
          </div>
          <button
            className="flex-shrink-0 rounded p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            onClick={handleClose}
            type="button"
            aria-label="Close detail panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400 uppercase">
            Read-only
          </span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${STATUS_CLASSES[session.status]}`}>
            {STATUS_LABELS[session.status]}
          </span>
          <span className="text-[11px] text-zinc-500">{session.toolCallCount} tools</span>
          <span className="text-[11px] text-zinc-500">{session.messageCount} msgs</span>
        </div>

        {hasForkedFrom && (
          <div className="mt-2 text-[11px] text-zinc-500">
            Forked from{" "}
            <button className="text-emerald-400 hover:underline" type="button">
              parent session
            </button>
          </div>
        )}

        {session.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {session.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 cursor-pointer hover:border-zinc-600"
                role="button"
                tabIndex={0}
                onClick={handleTagClick(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      {visible.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-zinc-600 text-sm">
          No messages in this session
        </div>
      ) : (
        <div className="session-detail-timeline px-4 py-3 space-y-3">
          {visible.map((entry, i) => {
            if (entry.type === "message" && entry.message) {
              return (
                <div key={`msg-${i}`} className="timeline-row flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[13px] ${
                        entry.message.role === "user" ? "text-zinc-300" : "text-zinc-400"
                      }`}
                    >
                      <span className="text-[10px] text-zinc-600 uppercase mr-1">
                        {entry.message.role}
                      </span>
                      {entry.message.content.slice(0, 200)}
                      {entry.message.content.length > 200 && "..."}
                    </div>
                  </div>
                  <button
                    className="text-[11px] text-zinc-600 hover:text-emerald-400 transition-colors ml-2 shrink-0"
                    onClick={handleFork(entry.messageIndex!)}
                    type="button"
                    title="Fork from this message"
                  >
                    Fork
                  </button>
                </div>
              );
            }
            if (entry.type === "tool-call" && entry.toolCall) {
              return (
                <div key={`tc-${i}`} className="timeline-row pl-6">
                  <div
                    className="tool-call-entry rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                    data-tool-id={entry.toolCall.id}
                    data-tool-type={entry.toolCall.type}
                    data-tool-status={entry.toolCall.status}
                  >
                    <div className="flex items-center gap-2">
                      <ToolCallStatusIcon status={entry.toolCall.status} />
                      <span className="text-xs font-medium text-zinc-300">{entry.toolCall.title}</span>
                      <span className="text-[11px] text-zinc-600 uppercase">{entry.toolCall.type}</span>
                    </div>
                    <ToolCallDetail tc={entry.toolCall} />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="px-4 py-3 border-t border-zinc-800">
          <button
            className="w-full text-xs text-zinc-400 hover:text-zinc-200 py-1.5 rounded border border-zinc-800 hover:bg-zinc-800/50 transition-colors"
            onClick={handleLoadMore}
            type="button"
          >
            Load more &middot;{" "}
            <span className="text-zinc-500">{remaining} remaining</span> &middot;{" "}
            <span className="text-zinc-600">{timeline.length} entries</span>
          </button>
        </div>
      )}
    </div>
  );
}
