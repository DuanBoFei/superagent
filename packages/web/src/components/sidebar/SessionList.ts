import type { SessionSummary } from "../../types/session-history";
import { renderSessionListItem } from "./SessionListItem";
import type { SessionListItemOptions } from "./SessionListItem";

export interface SessionListOptions {
  sessions: SessionSummary[];
  activeSessionId?: string | null;
  selectedIds?: Set<string>;
  isLoading?: boolean;
  onSelect?: (id: string, modifiers: { shift: boolean; ctrl: boolean }) => void;
  onDelete?: (id: string) => void;
  onToggleSelect?: (id: string) => void;
}

export interface SessionListController {
  attach(): void;
  detach(): void;
  scrollToSession(id: string): void;
  scrollToTop(): void;
}

const VIRTUAL_THRESHOLD = 20;
const ESTIMATED_ITEM_HEIGHT = 96;
const OVERSCAN_COUNT = 5;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderSkeleton(): string {
  const items = Array.from(
    { length: 5 },
    () => `
    <div class="skeleton-item flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div class="w-2 h-2 rounded-full bg-zinc-800 shrink-0"></div>
      <div class="flex-1 min-w-0 space-y-2">
        <div class="h-4 bg-zinc-800 rounded w-3/4"></div>
        <div class="h-3 bg-zinc-800 rounded w-full"></div>
      </div>
      <div class="h-3 bg-zinc-800 rounded w-10 shrink-0"></div>
    </div>`,
  ).join("");

  return `<div class="session-list session-list--loading" role="listbox" aria-label="Session list" aria-busy="true" data-session-count="0">
    <div class="session-list-inner" style="overflow-y:auto;height:100%">
      ${items}
    </div>
  </div>`;
}

function renderEmpty(): string {
  return `<div class="session-list session-list--empty" role="listbox" aria-label="Session list" data-session-count="0">
    <div class="flex flex-col items-center justify-center h-full text-center px-4 py-12">
      <div class="text-zinc-600 text-4xl mb-3" aria-hidden="true">[ ]</div>
      <p class="text-zinc-400 text-sm font-medium">No sessions yet</p>
      <p class="text-zinc-400 text-xs mt-1">Start a conversation to see it here</p>
    </div>
  </div>`;
}

export function renderSessionList(options: SessionListOptions): string {
  const { sessions, isLoading, activeSessionId, selectedIds } = options;

  if (isLoading && sessions.length === 0) {
    return renderSkeleton();
  }

  if (sessions.length === 0) {
    return renderEmpty();
  }

  const useVirtual = sessions.length > VIRTUAL_THRESHOLD;
  const virtualClass = useVirtual ? " session-list--virtual" : "";
  const virtualAttr = useVirtual ? ' data-virtual-scroll="true"' : "";
  const selIds = selectedIds ?? new Set<string>();

  const itemOptions: SessionListItemOptions[] = sessions.map((s) => ({
    session: s,
    isActive: s.id === activeSessionId,
    isSelected: selIds.has(s.id),
  }));

  if (!useVirtual) {
    const itemsHtml = itemOptions
      .map((opts) => renderSessionListItem(opts))
      .join("");

    const activeDescendantAttr = activeSessionId
      ? ` aria-activedescendant="${escapeAttr(activeSessionId)}"`
      : "";

    return `<div class="session-list${virtualClass}" role="listbox" aria-multiselectable="true" aria-label="Session list" data-session-count="${sessions.length}"${activeDescendantAttr}${virtualAttr}>
      <div class="session-list-inner" style="overflow-y:auto;height:100%">
        ${itemsHtml}
      </div>
    </div>`;
  }

  // Virtual scroll mode: render spacer + initially visible batch
  const totalHeight = sessions.length * ESTIMATED_ITEM_HEIGHT;
  const initialCount = Math.min(sessions.length, 15);
  const initialHtml = itemOptions
    .slice(0, initialCount)
    .map((opts) => renderSessionListItem(opts))
    .join("");

  const activeDescendantAttr2 = activeSessionId
    ? ` aria-activedescendant="${escapeAttr(activeSessionId)}"`
    : "";

  return `<div class="session-list${virtualClass}" role="listbox" aria-multiselectable="true" aria-label="Session list" data-session-count="${sessions.length}"${activeDescendantAttr2}${virtualAttr}>
    <div class="session-list-inner" style="overflow-y:auto;height:100%">
      <div class="session-list-spacer" style="height:${totalHeight}px;position:relative">
        <div class="session-list-viewport" style="position:absolute;top:0;left:0;right:0">
          ${initialHtml}
        </div>
      </div>
    </div>
  </div>`;
}

export function createSessionListController(
  el: HTMLElement,
  options: SessionListOptions,
): SessionListController {
  const { sessions, onSelect, onDelete, onToggleSelect } = options;
  const useVirtual = sessions.length > VIRTUAL_THRESHOLD;

  let scrollContainer: HTMLElement | null = null;
  let viewport: HTMLElement | null = null;
  let spacer: HTMLElement | null = null;
  let onScrollHandler: (() => void) | null = null;

  function findElements(): boolean {
    scrollContainer = el.querySelector<HTMLElement>(".session-list-inner");
    if (!scrollContainer) return false;
    if (useVirtual) {
      spacer = el.querySelector<HTMLElement>(".session-list-spacer");
      viewport = el.querySelector<HTMLElement>(".session-list-viewport");
    }
    return true;
  }

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Find the closest session item
    const item = target.closest<HTMLElement>("[data-session-id]");
    if (!item) return;

    const id = item.getAttribute("data-session-id")!;

    if (target.closest('[data-action="delete-session"]')) {
      onDelete?.(id);
      return;
    }
    if (target.closest('[data-action="toggle-select"]')) {
      onToggleSelect?.(id);
      return;
    }

    onSelect?.(id, {
      shift: e.shiftKey,
      ctrl: e.ctrlKey || e.metaKey,
    });
  }

  function onKeyDown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.preventDefault();
      for (const s of sessions) {
        onToggleSelect?.(s.id);
      }
    }
  }

  // ── Virtual scroll ──────────────────────────────

  function getItemTop(index: number): number {
    return index * ESTIMATED_ITEM_HEIGHT;
  }

  function getVisibleRange(): { start: number; end: number } {
    if (!scrollContainer) return { start: 0, end: sessions.length };
    const scrollTop = scrollContainer.scrollTop;
    const containerHeight = scrollContainer.clientHeight;

    const start = Math.max(0, Math.floor(scrollTop / ESTIMATED_ITEM_HEIGHT) - OVERSCAN_COUNT);
    const end = Math.min(
      sessions.length,
      Math.ceil((scrollTop + containerHeight) / ESTIMATED_ITEM_HEIGHT) + OVERSCAN_COUNT,
    );

    return { start, end };
  }

  function renderVisibleItems(): void {
    if (!viewport || !spacer) return;
    const { start, end } = getVisibleRange();

    const selIds = options.selectedIds ?? new Set<string>();
    const fragItems: string[] = [];

    for (let i = start; i < end; i++) {
      const s = sessions[i];
      const top = getItemTop(i);
      const html = renderSessionListItem({
        session: s,
        isActive: s.id === options.activeSessionId,
        isSelected: selIds.has(s.id),
      });
      const wrapped = html.replace(
        /^<li /,
        `<li style="position:absolute;top:${top}px;left:0;right:0" `,
      );
      fragItems.push(wrapped);
    }

    viewport.innerHTML = fragItems.join("");
  }

  function setupVirtualScroll(): void {
    if (!scrollContainer) return;
    onScrollHandler = () => renderVisibleItems();
    scrollContainer.addEventListener("scroll", onScrollHandler, { passive: true });
    renderVisibleItems();
  }

  return {
    attach(): void {
      if (!findElements()) return;
      el.addEventListener("click", onClick);
      el.addEventListener("keydown", onKeyDown);
      if (useVirtual) {
        setupVirtualScroll();
      }
    },

    detach(): void {
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKeyDown);
      if (scrollContainer && onScrollHandler) {
        scrollContainer.removeEventListener("scroll", onScrollHandler);
      }
      scrollContainer = null;
      viewport = null;
      spacer = null;
      onScrollHandler = null;
    },

    scrollToSession(id: string): void {
      const item = el.querySelector<HTMLElement>(`[data-session-id="${escapeAttr(id)}"]`);
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    },

    scrollToTop(): void {
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    },
  };
}
