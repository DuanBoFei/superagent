import type { SessionSummary } from "../../types/session-history";
import { escapeAttr } from "./escape";

export interface SessionListItemOptions {
  session: SessionSummary;
  isActive?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleSelect?: (id: string) => void;
}

export interface SessionListItemController {
  attach(): void;
  detach(): void;
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
      return "status-active bg-blue-500";
    case "error":
      return "status-error bg-red-500";
    case "completed":
    default:
      return "status-completed bg-emerald-500";
  }
}

function renderTags(tags: string[]): string {
  if (tags.length === 0) return "";

  const visible = tags.slice(0, 3);
  const overflow = tags.length - 3;

  const chips = visible
    .map(
      (tag) =>
        `<span class="session-tag inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-800/50 rounded border border-zinc-700/50">${escapeAttr(tag)}</span>`,
    )
    .join("");

  const overflowHtml =
    overflow > 0
      ? `<span class="session-tag inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">+${overflow}</span>`
      : "";

  return `<div class="session-tags flex flex-wrap gap-1 mt-1">${chips}${overflowHtml}</div>`;
}

export function renderSessionListItem(options: SessionListItemOptions): string {
  const { session, isActive = false, isSelected = false } = options;
  const activeClass = isActive ? "session-item--active bg-zinc-900 border-l-emerald-500" : "";
  const duration = formatDuration(session.durationMs);
  const statusDot = statusClass(session.status);
  const tags = renderTags(session.tags);
  const forkHtml = session.forkedFrom
    ? `<span class="fork-indicator ml-1 text-zinc-400" title="Forked from another session" aria-label="Forked session">&#x2387;</span>`
    : "";

  return `<li class="session-item group relative flex flex-col px-3 py-2.5 cursor-pointer border-l-2 border-l-transparent hover:bg-zinc-900/70 transition-colors duration-100 motion-reduce:transition-none ${activeClass}" data-session-id="${escapeAttr(session.id)}" data-action="select-session" role="option" aria-selected="${isActive ? "true" : "false"}" aria-label="Session: ${escapeAttr(session.title)}" tabindex="0">
  <div class="flex items-start justify-between gap-2">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <span class="inline-block w-2 h-2 rounded-full shrink-0 ${statusDot}" aria-hidden="true"></span>
        <span class="text-sm font-semibold text-zinc-200 truncate">${escapeAttr(session.title)}</span>
        ${forkHtml}
      </div>
      <p class="text-xs text-zinc-400 mt-0.5 line-clamp-2 overflow-hidden">${escapeAttr(session.firstMessagePreview)}</p>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <input type="checkbox" class="multi-select checkbox opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? "opacity-100" : ""}" data-action="toggle-select" ${isSelected ? "checked" : ""} aria-label="Select session" tabindex="-1">
      <button type="button" class="session-delete-btn opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-400 p-0.5" data-action="delete-session" aria-label="Delete session" tabindex="-1">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>
  </div>
  <div class="flex items-center gap-3 mt-1.5">
    <span class="text-[11px] font-mono text-zinc-400">${duration}</span>
    <span class="tool-count text-[11px] font-mono text-zinc-400">${session.toolCallCount} tool${session.toolCallCount !== 1 ? "s" : ""}</span>
    <span class="text-[11px] font-mono text-zinc-400">${session.messageCount} msg</span>
  </div>
  ${tags}
</li>`;
}

export function createSessionListItemController(
  el: HTMLElement,
  options: SessionListItemOptions,
): SessionListItemController {
  const { session, onSelect, onDelete, onToggleSelect } = options;

  let deleteBtn: HTMLElement | null = null;
  let checkbox: HTMLElement | null = null;

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('[data-action="delete-session"]')) {
      onDelete?.(session.id);
      return;
    }
    if (target.closest('[data-action="toggle-select"]')) {
      onToggleSelect?.(session.id);
      return;
    }
    onSelect?.(session.id);
  }

  return {
    attach(): void {
      deleteBtn = el.querySelector('[data-action="delete-session"]');
      checkbox = el.querySelector('[data-action="toggle-select"]');
      el.addEventListener("click", onClick);
    },

    detach(): void {
      el.removeEventListener("click", onClick);
      deleteBtn = null;
      checkbox = null;
    },
  };
}
