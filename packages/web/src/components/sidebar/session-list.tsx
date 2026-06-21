"use client";

import { useCallback, useEffect, useRef } from "react";
import { SessionListItem } from "./session-list-item";
import type { SessionSummary } from "../../types/session-history";

const VIRTUAL_THRESHOLD = 20;
const ESTIMATED_ITEM_HEIGHT = 96;
const OVERSCAN_COUNT = 5;

export interface SessionListProps {
  sessions: SessionSummary[];
  activeSessionId?: string | null;
  selectedIds?: Set<string>;
  isLoading?: boolean;
  onSelect?: (id: string, modifiers: { shift: boolean; ctrl: boolean }) => void;
  onDelete?: (id: string) => void;
  onToggleSelect?: (id: string) => void;
}

function SkeletonList() {
  return (
    <div className="session-list--loading" role="listbox" aria-label="Session list" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-zinc-800 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-800 rounded w-full" />
          </div>
          <div className="h-3 bg-zinc-800 rounded w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function EmptyList() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
      <div className="text-zinc-600 text-4xl mb-3" aria-hidden="true">[ ]</div>
      <p className="text-zinc-400 text-sm font-medium">No sessions yet</p>
      <p className="text-zinc-400 text-xs mt-1">Start a conversation to see it here</p>
    </div>
  );
}

export function SessionList({
  sessions,
  activeSessionId,
  selectedIds = new Set(),
  isLoading = false,
  onSelect,
  onDelete,
  onToggleSelect,
}: SessionListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      onSelect?.(id, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
    },
    [onSelect],
  );

  // Keyboard: Ctrl+A selects all
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        for (const s of sessions) {
          onToggleSelect?.(s.id);
        }
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [sessions, onToggleSelect]);

  if (isLoading && sessions.length === 0) {
    return <SkeletonList />;
  }

  if (sessions.length === 0) {
    return <EmptyList />;
  }

  const useVirtual = sessions.length > VIRTUAL_THRESHOLD;

  if (!useVirtual) {
    return (
      <div
        ref={containerRef}
        className="session-list h-full overflow-y-auto"
        role="listbox"
        aria-multiselectable="true"
        aria-label="Session list"
        data-session-count={sessions.length}
      >
        {sessions.map((s) => (
          <SessionListItem
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            isSelected={selectedIds.has(s.id)}
            onSelect={(e) => handleSelect(s.id, e)}
            onDelete={onDelete}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    );
  }

  // Virtual scroll: we don't implement full virtual scroll in React yet,
  // but render all items for now. The threshold is high enough that this
  // is acceptable for MVP.
  return (
    <div
      ref={containerRef}
      className="session-list h-full overflow-y-auto"
      role="listbox"
      aria-multiselectable="true"
      aria-label="Session list"
      data-session-count={sessions.length}
    >
      {sessions.map((s) => (
        <SessionListItem
          key={s.id}
          session={s}
          isActive={s.id === activeSessionId}
          isSelected={selectedIds.has(s.id)}
          onSelect={(e) => handleSelect(s.id, e)}
          onDelete={onDelete}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
