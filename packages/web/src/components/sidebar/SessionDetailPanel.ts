import type { Session, SessionStatus } from "../../types/session-history";
import type { Message } from "../../types/message";
import type { ToolCardState, BashCard } from "../../types/cards";
import { renderMessageBubble } from "../chat/message-bubble";
import { renderTerminal } from "../chat/terminal/TerminalRenderer";
import { escapeAttr, escapeHtml } from "./escape";

export interface SessionDetailPanelOptions {
  session: Session;
  maxEntries?: number;
  onFork?: (messageIndex: number) => void;
  onClose?: () => void;
  onTagClick?: (tag: string) => void;
  onLoadMore?: () => void;
}

export interface SessionDetailPanelController {
  attach(): void;
  detach(): void;
}

// ── Helpers ────────────────────────────────────────────

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

const STATUS_LABELS: Record<SessionStatus, string> = {
  active: "Active",
  completed: "Completed",
  error: "Error",
};

const STATUS_CLASSES: Record<SessionStatus, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  completed: "text-neutral-400 bg-neutral-400/10",
  error: "text-red-400 bg-red-400/10",
};

// ── Tool call rendering ────────────────────────────────

function renderToolCallEntry(tc: ToolCardState): string {
  const statusIcon =
    tc.status === "success"
      ? "&#10003;"
      : tc.status === "error"
        ? "&#10007;"
        : tc.status === "running"
          ? "&#9679;"
          : "&#9711;";
  const statusClass =
    tc.status === "success"
      ? "text-emerald-400"
      : tc.status === "error"
        ? "text-red-400"
        : tc.status === "running"
          ? "text-amber-400"
          : "text-neutral-500";

  let detailHtml = "";

  switch (tc.type) {
    case "bash": {
      const bash = tc as BashCard;
      const cmd = `${bash.content.command} ${bash.content.args.join(" ")}`;
      if (bash.content.output) {
        detailHtml = `<div class="tool-call-output mt-2">${renderTerminal(bash.content.output, { maxLines: 200 })}</div>`;
      }
      if (bash.content.exitCode !== null) {
        detailHtml += `<span class="text-[11px] text-neutral-500 mt-1 block">Exit code: ${bash.content.exitCode}${bash.content.durationMs ? ` &middot; ${(bash.content.durationMs / 1000).toFixed(1)}s` : ""}</span>`;
      }
      break;
    }
    case "file-read": {
      const fr = tc as import("../../types/cards").FileReadCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${escapeHtml(fr.content.filePath)} &middot; ${fr.content.lineCount} lines &middot; ${fr.content.language}</span>`;
      break;
    }
    case "file-write": {
      const fw = tc as import("../../types/cards").FileWriteCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${escapeHtml(fw.content.filePath)} &middot; ${fw.content.linesWritten} lines written</span>`;
      break;
    }
    case "file-edit": {
      const fe = tc as import("../../types/cards").FileEditCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${escapeHtml(fe.content.filePath)} &middot; +${fe.content.linesAdded}/-${fe.content.linesRemoved}</span>`;
      break;
    }
    case "grep": {
      const gr = tc as import("../../types/cards").GrepCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${gr.content.totalMatches} matches in ${gr.content.filesSearched} files</span>`;
      break;
    }
    case "glob": {
      const gl = tc as import("../../types/cards").GlobCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${gl.content.totalFiles} files matched</span>`;
      break;
    }
    case "task-list": {
      const tl = tc as import("../../types/cards").TaskListCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${tl.content.completedCount}/${tl.content.totalCount} tasks</span>`;
      break;
    }
    case "sub-agent-grid": {
      const sg = tc as import("../../types/cards").SubAgentGridCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${sg.content.cells.length} agents</span>`;
      break;
    }
    case "web-search": {
      const ws = tc as import("../../types/cards").WebSearchCard;
      detailHtml = `<span class="text-[11px] text-neutral-500">${ws.content.totalResults} results for "${escapeHtml(ws.content.query)}"</span>`;
      break;
    }
  }

  return `<div class="tool-call-entry rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2" data-tool-id="${escapeAttr(tc.id)}" data-tool-type="${tc.type}" data-tool-status="${tc.status}">
    <div class="flex items-center gap-2">
      <span class="${statusClass} text-xs">${statusIcon}</span>
      <span class="text-xs font-medium text-neutral-300">${escapeHtml(tc.title)}</span>
      <span class="text-[11px] text-neutral-600 uppercase">${tc.type}</span>
    </div>
    ${detailHtml}
  </div>`;
}

// ── Timeline entry ─────────────────────────────────────

interface TimelineEntry {
  type: "message" | "tool-call";
  timestamp: number;
  messageIndex?: number;
  message?: Message;
  toolCall?: ToolCardState;
}

function buildTimeline(session: Session): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  let msgIdx = 0;
  for (const msg of session.messages) {
    entries.push({
      type: "message",
      timestamp: msg.timestamp,
      messageIndex: msgIdx,
      message: msg,
    });
    msgIdx++;
  }

  for (const tc of session.toolCalls) {
    entries.push({
      type: "tool-call",
      timestamp: tc.timestamp,
      toolCall: tc,
    });
  }

  entries.sort((a, b) => a.timestamp - b.timestamp);
  return entries;
}

// ── Render ─────────────────────────────────────────────

export function renderSessionDetailPanel(options: SessionDetailPanelOptions): string {
  const { session, maxEntries } = options;

  const hasForkedFrom = session.forkedFrom !== null;
  const timeline = buildTimeline(session);
  const isEmpty = timeline.length === 0;
  const limit = maxEntries ?? 50;
  const hasMore = timeline.length > limit;
  const visible = hasMore ? timeline.slice(0, limit) : timeline;
  const remaining = timeline.length - limit;

  // Header
  const headerHtml = `<div class="session-detail-header border-b border-neutral-800 px-4 py-3">
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h2 class="text-sm font-semibold text-neutral-100 truncate">${escapeHtml(session.title)}</h2>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[11px] text-neutral-500">${formatTimestamp(session.createdAt)}</span>
          <span class="text-[11px] text-neutral-600">&middot;</span>
          <span class="text-[11px] text-neutral-500">${formatDuration(session.durationMs)}</span>
        </div>
      </div>
      <button class="session-detail-close flex-shrink-0 rounded p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors" data-action="close-detail" type="button" aria-label="Close detail panel">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-[11px] px-1.5 py-0.5 rounded border border-neutral-800 text-neutral-400 uppercase">Read-only</span>
      <span class="text-[11px] px-1.5 py-0.5 rounded ${STATUS_CLASSES[session.status]}">${STATUS_LABELS[session.status]}</span>
      <span class="text-[11px] text-neutral-500">${session.toolCallCount} tools</span>
      <span class="text-[11px] text-neutral-500">${session.messageCount} msgs</span>
    </div>
    ${hasForkedFrom ? `<div class="mt-2 text-[11px] text-neutral-500">
      Forked from <button class="text-emerald-400 hover:underline" data-action="go-to-parent" type="button">parent session</button>
    </div>` : ""}
    ${session.tags.length > 0 ? `<div class="flex items-center gap-1 mt-2 flex-wrap">${session.tags.map((tag) => `<span class="tag-chip text-[11px] px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-400 cursor-pointer hover:border-neutral-600" data-tag="${escapeAttr(tag)}" role="button" tabindex="0">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
  </div>`;

  // Timeline
  let timelineHtml = "";
  if (isEmpty) {
    timelineHtml = `<div class="session-detail-empty flex items-center justify-center py-12 text-neutral-600 text-sm">No messages in this session</div>`;
  } else {
    timelineHtml = `<div class="session-detail-timeline px-4 py-3 space-y-3">`;
    for (const entry of visible) {
      if (entry.type === "message" && entry.message) {
        const forkBtn = `<button class="session-detail-fork-btn text-[11px] text-neutral-600 hover:text-emerald-400 transition-colors ml-2" data-action="fork-from-here" data-message-index="${entry.messageIndex}" type="button" title="Fork from this message">Fork</button>`;
        timelineHtml += `<div class="timeline-row flex items-start gap-2">
          <div class="flex-1 min-w-0">${renderMessageBubble(entry.message)}</div>
          ${forkBtn}
        </div>`;
      } else if (entry.type === "tool-call" && entry.toolCall) {
        timelineHtml += `<div class="timeline-row pl-6">${renderToolCallEntry(entry.toolCall)}</div>`;
      }
    }
    timelineHtml += `</div>`;
  }

  // Load more
  const loadMoreHtml = hasMore
    ? `<div class="session-detail-load-more px-4 py-3 border-t border-neutral-800">
        <button class="w-full text-xs text-neutral-400 hover:text-neutral-200 py-1.5 rounded border border-neutral-800 hover:bg-neutral-800/50 transition-colors" data-action="load-more" type="button">
          Load more &middot; <span class="text-neutral-500">${remaining} remaining</span> &middot; <span class="text-neutral-600">${timeline.length} entries</span>
        </button>
      </div>`
    : "";

  return `<div class="session-detail-panel flex flex-col h-full bg-neutral-950 border-l border-neutral-800 overflow-y-auto">
    ${headerHtml}
    ${timelineHtml}
    ${loadMoreHtml}
  </div>`;
}

// ── Controller ─────────────────────────────────────────

export function createSessionDetailPanelController(
  el: HTMLElement,
  options: SessionDetailPanelOptions,
): SessionDetailPanelController {
  const { onClose, onFork, onTagClick, onLoadMore } = options;

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const closeBtn = target.closest<HTMLElement>('[data-action="close-detail"]');
    if (closeBtn) {
      onClose?.();
      return;
    }

    const loadMoreBtn = target.closest<HTMLElement>('[data-action="load-more"]');
    if (loadMoreBtn) {
      onLoadMore?.();
      return;
    }

    const forkBtn = target.closest<HTMLElement>('[data-action="fork-from-here"]');
    if (forkBtn) {
      const idx = forkBtn.getAttribute("data-message-index");
      if (idx !== null) {
        onFork?.(Number(idx));
      }
      return;
    }

    const parentBtn = target.closest<HTMLElement>('[data-action="go-to-parent"]');
    if (parentBtn) {
      return;
    }

    const tagChip = target.closest<HTMLElement>("[data-tag]");
    if (tagChip) {
      const tag = tagChip.getAttribute("data-tag")!;
      onTagClick?.(tag);
    }
  }

  return {
    attach(): void {
      el.addEventListener("click", onClick);
    },

    detach(): void {
      el.removeEventListener("click", onClick);
    },
  };
}
