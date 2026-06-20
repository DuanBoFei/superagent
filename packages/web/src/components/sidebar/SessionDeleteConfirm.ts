import type { SessionSummary } from "../../types/session-history";

// ── Types ───────────────────────────────────────────────

export interface TombstoneEntry {
  id: string;
  sessions: SessionSummary[];
  expiresAt: number;
}

export interface DeleteConfirmOptions {
  mode: "single" | "bulk" | "clearAll";
  sessionTitle?: string;
  sessionCount?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface DeleteConfirmController {
  attach(): void;
  detach(): void;
}

export interface UndoToastOptions {
  message: string;
  remainingSeconds: number;
  visible: boolean;
  durationMs: number;
  onUndo?: () => void;
  onDismiss?: () => void;
}

export interface UndoToastController {
  attach(): void;
  detach(): void;
  startCountdown(): void;
}

// ── Tombstone pure functions ────────────────────────────

export function tombstoneAdd(
  queue: TombstoneEntry[],
  sessions: SessionSummary[],
  now = Date.now(),
): { queue: TombstoneEntry[]; entry: TombstoneEntry } {
  const entry: TombstoneEntry = {
    id: crypto.randomUUID(),
    sessions,
    expiresAt: now + 5000,
  };
  return { queue: [...queue, entry], entry };
}

export function tombstoneRemove(
  queue: TombstoneEntry[],
  id: string,
): { queue: TombstoneEntry[]; entry: TombstoneEntry | null } {
  const idx = queue.findIndex((e) => e.id === id);
  if (idx === -1) return { queue, entry: null };
  return {
    queue: [...queue.slice(0, idx), ...queue.slice(idx + 1)],
    entry: queue[idx],
  };
}

export function tombstoneCleanExpired(
  queue: TombstoneEntry[],
  now = Date.now(),
): { queue: TombstoneEntry[]; expired: TombstoneEntry[] } {
  const expired: TombstoneEntry[] = [];
  const active: TombstoneEntry[] = [];
  for (const e of queue) {
    if (now >= e.expiresAt) expired.push(e);
    else active.push(e);
  }
  return { queue: active, expired };
}

// ── Delete confirm render ───────────────────────────────

export function renderDeleteConfirm(options: DeleteConfirmOptions): string {
  const { mode, sessionTitle, sessionCount } = options;

  const title =
    mode === "single"
      ? `Delete "${sessionTitle}"?`
      : mode === "bulk"
        ? `Delete ${sessionCount} selected sessions?`
        : "Delete ALL sessions?";

  const confirmAction =
    mode === "clearAll" ? "clear-all-confirm" : "delete-confirm";

  const clearAllInput =
    mode === "clearAll"
      ? `<div class="session-delete-confirm-input-wrap mt-2">
           <label class="text-[11px] text-neutral-400 block mb-1">Type <span class="text-red-400 font-mono">DELETE</span> to confirm</label>
           <input type="text" class="session-delete-confirm-input w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-[13px] text-neutral-200 font-mono focus:border-red-500/50 focus:outline-none" placeholder="DELETE" data-action="clear-all-input" />
         </div>`
      : "";

  const confirmDisabled = mode === "clearAll" ? " disabled" : "";

  return `<div class="session-delete-confirm fixed inset-0 z-50 flex items-center justify-center bg-black/60 select-none">
    <div class="session-delete-confirm-dialog w-[380px] bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg p-5">
      <p class="text-[14px] text-neutral-200 font-medium mb-1">${escapeHtml(title)}</p>
      ${mode !== "clearAll" ? `<p class="text-[12px] text-neutral-500 mb-3">This action cannot be undone.</p>` : `<p class="text-[12px] text-red-400 mb-3">This will permanently delete ALL sessions. This action cannot be undone.</p>`}
      ${clearAllInput}
      <div class="flex justify-end gap-2 mt-3">
        <button class="session-delete-cancel-btn text-[12px] px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors" data-action="delete-cancel" type="button">Cancel</button>
        <button class="session-delete-confirm-btn text-[12px] px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors${confirmDisabled}" data-action="${confirmAction}" type="button"${confirmDisabled}>Delete</button>
      </div>
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Delete confirm controller ──────────────────────────

export function createDeleteConfirmController(
  el: HTMLElement,
  options: DeleteConfirmOptions,
): DeleteConfirmController {
  const { mode, onConfirm, onCancel } = options;

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const confirmBtn = target.closest<HTMLElement>(
      `[data-action="delete-confirm"], [data-action="clear-all-confirm"]`,
    );
    if (confirmBtn) {
      if (mode === "clearAll") {
        const input = el.querySelector<HTMLInputElement>(
          '[data-action="clear-all-input"]',
        );
        if (!input || input.value !== "DELETE") return;
      }
      onConfirm?.();
      return;
    }

    const cancelBtn = target.closest<HTMLElement>(
      '[data-action="delete-cancel"]',
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

  function onInput(): void {
    if (mode !== "clearAll") return;
    const input = el.querySelector<HTMLInputElement>(
      '[data-action="clear-all-input"]',
    );
    const btn = el.querySelector<HTMLElement>(
      '[data-action="clear-all-confirm"]',
    );
    if (!input || !btn) return;
    if (input.value === "DELETE") {
      btn.removeAttribute("disabled");
    } else {
      btn.setAttribute("disabled", "");
    }
  }

  return {
    attach(): void {
      el.addEventListener("click", onClick);
      document.addEventListener("keydown", onKeyDown);

      if (mode === "clearAll") {
        const input = el.querySelector<HTMLInputElement>(
          '[data-action="clear-all-input"]',
        );
        input?.addEventListener("input", onInput);
      }
    },

    detach(): void {
      el.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);

      if (mode === "clearAll") {
        const input = el.querySelector<HTMLInputElement>(
          '[data-action="clear-all-input"]',
        );
        input?.removeEventListener("input", onInput);
      }
    },
  };
}

// ── Undo toast render ──────────────────────────────────

export function renderUndoToast(options: UndoToastOptions): string {
  const { message, remainingSeconds, visible } = options;
  const visibilityClass = visible ? "" : " hidden";

  return `<div class="session-undo-toast fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg select-none transition-all${visibilityClass}">
    <span class="text-[12px] text-neutral-300">${escapeHtml(message)}</span>
    <span class="session-undo-toast-countdown text-[11px] text-neutral-500 tabular-nums">${remainingSeconds}</span>
    <button class="text-[12px] px-2 py-1 rounded bg-neutral-700 text-emerald-400 hover:bg-neutral-600 transition-colors" data-action="undo-delete" type="button">Undo</button>
    <button class="text-[12px] px-1 py-1 text-neutral-500 hover:text-neutral-300 transition-colors" data-action="undo-dismiss" type="button" aria-label="Dismiss">&#x2715;</button>
  </div>`;
}

// ── Undo toast controller ──────────────────────────────

export function createUndoToastController(
  el: HTMLElement,
  options: UndoToastOptions,
): UndoToastController {
  const { durationMs, onUndo, onDismiss } = options;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let secondsRemaining = options.remainingSeconds;
  let dismissed = false;

  function tick(): void {
    if (dismissed) return;
    secondsRemaining--;
    if (secondsRemaining <= 0) {
      stopTimer();
      onDismiss?.();
      return;
    }
    // Update the countdown label
    const label = el.querySelector<HTMLElement>(
      ".session-undo-toast-countdown",
    );
    if (label) label.textContent = String(secondsRemaining);
  }

  function stopTimer(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const undoBtn = target.closest<HTMLElement>('[data-action="undo-delete"]');
    if (undoBtn) {
      dismissed = true;
      stopTimer();
      onUndo?.();
      return;
    }

    const dismissBtn = target.closest<HTMLElement>(
      '[data-action="undo-dismiss"]',
    );
    if (dismissBtn) {
      dismissed = true;
      stopTimer();
      onDismiss?.();
      return;
    }
  }

  return {
    attach(): void {
      el.addEventListener("click", onClick);
    },

    detach(): void {
      stopTimer();
      el.removeEventListener("click", onClick);
    },

    startCountdown(): void {
      // Each tick = 1 second
      const tickMs = Math.min(1000, durationMs / options.remainingSeconds);
      intervalId = setInterval(tick, tickMs);
    },
  };
}
