"use client";

import { useRef } from "react";

export interface SessionExportImportProps {
  hasSelection: boolean;
  onExportSelected?: () => void;
  onExportAll?: () => void;
  onImportFile?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SessionExportImport({
  hasSelection,
  onExportSelected,
  onExportAll,
  onImportFile,
}: SessionExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="session-export-import flex items-center gap-1.5 px-3 py-2 bg-neutral-950 border-b border-zinc-800 select-none">
      <button
        className={`text-[11px] px-2 py-1 rounded border transition-colors ${
          hasSelection
            ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            : "text-zinc-500 border-zinc-700 opacity-50"
        }`}
        disabled={!hasSelection}
        onClick={onExportSelected}
        type="button"
      >
        Export
      </button>

      <button
        className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        onClick={onExportAll}
        type="button"
      >
        Export All
      </button>

      <div className="flex-1" />

      <button
        className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        Import
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportFile}
        aria-label="Import sessions"
      />
    </div>
  );
}
