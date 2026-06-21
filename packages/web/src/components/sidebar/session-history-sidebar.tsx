"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionHistoryStore } from "../../store/session-history";
import { SessionList } from "./session-list";
import { SessionSearchFilter } from "./session-search-filter";
import { SessionExportImport } from "./session-export-import";
import { SessionDetailPanel } from "./session-detail-panel";
import { PlaybackControls } from "./playback-controls";
import { PlaybackTimeline } from "./playback-timeline";
import type { SessionSummary, Session } from "../../types/session-history";

const OVERLAY_BREAKPOINT = 768;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

export interface SessionHistorySidebarProps {
  sessions: SessionSummary[];
  isLoading?: boolean;
  availableTags?: string[];
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onExportSelected?: () => void;
  onExportAll?: () => void;
  onImportFile?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SessionHistorySidebar({
  sessions,
  isLoading = false,
  availableTags = [],
  onSelectSession,
  onDeleteSession,
  onExportSelected,
  onExportAll,
  onImportFile,
}: SessionHistorySidebarProps) {
  const open = useSessionHistoryStore((s) => s.sidebarOpen);
  const width = useSessionHistoryStore((s) => s.sidebarWidth);
  const mode = useSessionHistoryStore((s) => s.sidebarMode);
  const activeSessionId = useSessionHistoryStore((s) => s.activeSessionId);
  const toggleSidebar = useSessionHistoryStore((s) => s.toggleSidebar);
  const setSidebarWidth = useSessionHistoryStore((s) => s.setSidebarWidth);
  const setSidebarMode = useSessionHistoryStore((s) => s.setSidebarMode);
  const deselectSession = useSessionHistoryStore((s) => s.deselectSession);

  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Responsive overlay detection
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${OVERLAY_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setSidebarMode("overlay");
      } else {
        setSidebarMode("dock");
      }
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setSidebarMode]);

  // Keyboard: Escape closes sidebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        toggleSidebar();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, toggleSidebar]);

  // Drag-to-resize
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - dragStartX.current;
        setSidebarWidth(dragStartWidth.current + delta);
      };
      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width, setSidebarWidth],
  );

  const handleSelectSession = useCallback(
    (id: string) => {
      onSelectSession?.(id);
      setDetailSession(null);
    },
    [onSelectSession],
  );

  const handleCloseDetail = useCallback(() => {
    setDetailSession(null);
  }, []);

  const visibilityClass = open ? "translate-x-0" : "-translate-x-full";
  const zClass = mode === "overlay" ? "z-50 shadow-2xl" : "z-30";

  return (
    <aside
      className={`motion-reduce fixed left-0 top-0 flex h-full flex-col bg-neutral-950 border-r border-zinc-800 transition-transform duration-150 ease-out ${visibilityClass} ${zClass}`}
      style={{ width: `${width}px` }}
      role="complementary"
      aria-label="Session history"
      aria-expanded={open}
    >
      {/* Drag handle */}
      <div
        className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-emerald-500/50 transition-colors"
        onMouseDown={onDragStart}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <span className="text-sm font-semibold text-emerald-400 tracking-tight">
          SuperAgent
        </span>
        <button
          type="button"
          className="text-zinc-400 hover:text-zinc-300 transition-colors p-1 rounded"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {/* Search & Filter */}
      <SessionSearchFilter availableTags={availableTags} />

      {/* Export/Import */}
      <SessionExportImport
        hasSelection={false}
        onExportSelected={onExportSelected}
        onExportAll={onExportAll}
        onImportFile={onImportFile}
      />

      {/* Session List */}
      <div className="flex-1 overflow-hidden">
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          isLoading={isLoading}
          onSelect={handleSelectSession}
          onDelete={onDeleteSession}
        />
      </div>

      {/* Playback */}
      <PlaybackTimeline />
      <PlaybackControls />

      {/* Detail Panel (overlay) */}
      {detailSession && (
        <SessionDetailPanel
          session={detailSession}
          onClose={handleCloseDetail}
        />
      )}
    </aside>
  );
}
