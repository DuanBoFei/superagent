"use client";

import { useCallback, useEffect, useState } from "react";

export interface DeleteConfirmProps {
  mode: "single" | "bulk" | "clearAll";
  sessionTitle?: string;
  sessionCount?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function SessionDeleteConfirm({
  mode,
  sessionTitle,
  sessionCount,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  const [clearAllInput, setClearAllInput] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const title =
    mode === "single"
      ? `Delete "${sessionTitle}"?`
      : mode === "bulk"
        ? `Delete ${sessionCount} selected sessions?`
        : "Delete ALL sessions?";

  const canConfirm = mode !== "clearAll" || clearAllInput === "DELETE";

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    onConfirm?.();
  }, [canConfirm, onConfirm]);

  return (
    <div className="session-delete-confirm fixed inset-0 z-50 flex items-center justify-center bg-black/60 select-none">
      <div className="session-delete-confirm-dialog w-[380px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-5">
        <p className="text-[14px] text-zinc-200 font-medium mb-1">{title}</p>
        {mode !== "clearAll" ? (
          <p className="text-[12px] text-zinc-500 mb-3">This action cannot be undone.</p>
        ) : (
          <p className="text-[12px] text-red-400 mb-3">
            This will permanently delete ALL sessions. This action cannot be undone.
          </p>
        )}

        {mode === "clearAll" && (
          <div className="mt-2">
            <label className="text-[11px] text-zinc-400 block mb-1">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm
            </label>
            <input
              type="text"
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[13px] text-zinc-200 font-mono focus:border-red-500/50 focus:outline-none"
              placeholder="DELETE"
              value={clearAllInput}
              onChange={(e) => setClearAllInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) handleConfirm();
              }}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <button
            className="text-[12px] px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`text-[12px] px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors ${
              !canConfirm ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!canConfirm}
            onClick={handleConfirm}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Undo Toast ────────────────────────────────────────────

export interface UndoToastProps {
  message: string;
  remainingSeconds: number;
  visible: boolean;
  onUndo?: () => void;
  onDismiss?: () => void;
}

export function UndoToast({
  message,
  remainingSeconds,
  visible,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  if (!visible) return null;

  return (
    <div className="session-undo-toast fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg select-none">
      <span className="text-[12px] text-zinc-300">{message}</span>
      <span className="text-[11px] text-zinc-500 tabular-nums">{remainingSeconds}</span>
      <button
        className="text-[12px] px-2 py-1 rounded bg-zinc-700 text-emerald-400 hover:bg-zinc-600 transition-colors"
        onClick={onUndo}
        type="button"
      >
        Undo
      </button>
      <button
        className="text-[12px] px-1 py-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss"
      >
        &#x2715;
      </button>
    </div>
  );
}
