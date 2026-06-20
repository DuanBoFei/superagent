import type { Session } from "../../types/session-history";
import { escapeHtml } from "./escape";

// ── Types ───────────────────────────────────────────────

export interface ForkDialogOptions {
  sourceTitle: string;
  messageIndex: number;
  totalMessages: number;
  onConfirm?: (title: string) => void;
  onCancel?: () => void;
}

export interface ForkDialogController {
  attach(): void;
  detach(): void;
}

// ── Pure functions ──────────────────────────────────────

export function buildForkTitle(sourceTitle: string): string {
  return `Fork of "${sourceTitle}"`;
}

function generateUUID(): string {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
  hex[12] = "4";
  hex[16] = (8 + Math.floor(Math.random() * 4)).toString(16);
  return [
    hex.slice(0, 8).join(""),
    hex.slice(8, 12).join(""),
    hex.slice(12, 16).join(""),
    hex.slice(16, 20).join(""),
    hex.slice(20, 32).join(""),
  ].join("-");
}

export function forkSession(
  source: Session,
  messageIndex: number,
  newTitle?: string,
): Session {
  const now = Date.now();
  const copiedMessages = source.messages.slice(0, messageIndex + 1);

  // Copy toolCalls that are positioned before or at the fork point.
  // Since toolCalls don't carry a message index, we estimate by counting
  // tool calls that would reasonably appear before the fork index.
  // Conservative approach: copy all toolCalls (they're part of the context).
  const estimatedToolCallCount = Math.min(
    source.toolCalls.length,
    Math.ceil((messageIndex + 1) / 2),
  );
  const copiedToolCalls = source.toolCalls.slice(0, estimatedToolCallCount);

  return {
    id: generateUUID(),
    title: newTitle ?? buildForkTitle(source.title),
    createdAt: source.createdAt,
    updatedAt: now,
    durationMs: 0,
    toolCallCount: copiedToolCalls.length,
    messageCount: copiedMessages.length,
    status: "active",
    tags: [...source.tags],
    forkedFrom: source.id,
    forkedAtMessageIndex: messageIndex,
    messages: copiedMessages,
    toolCalls: copiedToolCalls,
  };
}

// ── Render ──────────────────────────────────────────────

export function renderForkDialog(options: ForkDialogOptions): string {
  const { sourceTitle, messageIndex, totalMessages } = options;
  const defaultTitle = buildForkTitle(sourceTitle);

  return `<div class="session-fork-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/60 select-none">
    <div class="session-fork-dialog-panel w-[400px] bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg p-5">
      <p class="text-[14px] text-neutral-200 font-medium mb-1">Fork Session</p>
      <p class="text-[12px] text-neutral-500 mb-4">
        This will create a new session containing messages 1–${messageIndex + 1} of ${totalMessages}.
        ${messageIndex + 1} messages will be copied.
      </p>

      <label class="text-[11px] text-neutral-400 block mb-1">Title</label>
      <input type="text" class="session-fork-title-input w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-[13px] text-neutral-200 font-mono focus:border-emerald-500/50 focus:outline-none" value="${escapeHtml(defaultTitle)}" data-action="fork-title-input" />

      <div class="flex justify-end gap-2 mt-4">
        <button class="text-[12px] px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors" data-action="fork-cancel" type="button">Cancel</button>
        <button class="text-[12px] px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" data-action="fork-confirm" type="button">Create Fork</button>
      </div>
    </div>
  </div>`;
}

// ── Controller ──────────────────────────────────────────

export function createForkDialogController(
  el: HTMLElement,
  options: ForkDialogOptions,
): ForkDialogController {
  const { onConfirm, onCancel } = options;

  function getTitle(): string {
    const input = el.querySelector<HTMLInputElement>(
      '[data-action="fork-title-input"]',
    );
    return input?.value || buildForkTitle(options.sourceTitle);
  }

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const confirmBtn = target.closest<HTMLElement>(
      '[data-action="fork-confirm"]',
    );
    if (confirmBtn) {
      onConfirm?.(getTitle());
      return;
    }

    const cancelBtn = target.closest<HTMLElement>(
      '[data-action="fork-cancel"]',
    );
    if (cancelBtn) {
      onCancel?.();
      return;
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      onCancel?.();
    }
  }

  return {
    attach(): void {
      el.addEventListener("click", onClick);
      document.addEventListener("keydown", onKeyDown);
    },

    detach(): void {
      el.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}
