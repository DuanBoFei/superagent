"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SessionForkDialogProps {
  sourceTitle: string;
  messageIndex: number;
  totalMessages: number;
  onConfirm?: (title: string) => void;
  onCancel?: () => void;
}

function buildForkTitle(sourceTitle: string): string {
  return `Fork of "${sourceTitle}"`;
}

export function SessionForkDialog({
  sourceTitle,
  messageIndex,
  totalMessages,
  onConfirm,
  onCancel,
}: SessionForkDialogProps) {
  const defaultTitle = buildForkTitle(sourceTitle);
  const [title, setTitle] = useState(defaultTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    onConfirm?.(title || defaultTitle);
  }, [title, defaultTitle, onConfirm]);

  return (
    <div className="session-fork-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/60 select-none">
      <div className="session-fork-dialog-panel w-[400px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-5">
        <p className="text-[14px] text-zinc-200 font-medium mb-1">Fork Session</p>
        <p className="text-[12px] text-zinc-500 mb-4">
          This will create a new session containing messages 1–{messageIndex + 1} of {totalMessages}.
          {messageIndex + 1} messages will be copied.
        </p>

        <label className="text-[11px] text-zinc-400 block mb-1">Title</label>
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-[13px] text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") onCancel?.();
          }}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="text-[12px] px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="text-[12px] px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            onClick={handleConfirm}
            type="button"
          >
            Create Fork
          </button>
        </div>
      </div>
    </div>
  );
}
