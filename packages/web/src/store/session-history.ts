"use client";

import { create } from "zustand";
import type { SessionSummary, SessionStatus, SearchQuery } from "../types/session-history";

export interface SessionHistoryState {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  searchQuery: SearchQuery;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarMode: "dock" | "overlay";
  isLoading: boolean;
  error: string | null;

  // Actions
  setSessions: (sessions: SessionSummary[]) => void;
  selectSession: (id: string) => void;
  deselectSession: () => void;
  setSearchQuery: (query: Partial<SearchQuery>) => void;
  resetSearchQuery: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarMode: (mode: "dock" | "overlay") => void;
  updateSessionTitle: (id: string, title: string) => void;
  updateSessionTags: (id: string, tags: string[]) => void;
  removeSession: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const DEFAULT_SEARCH: SearchQuery = {
  text: "",
  dateRange: null,
  statusFilter: null,
  tagsFilter: null,
};

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

const OVERLAY_BREAKPOINT = 768;

function getInitialMode(): "dock" | "overlay" {
  if (typeof window !== "undefined" && window.innerWidth < OVERLAY_BREAKPOINT) {
    return "overlay";
  }
  return "dock";
}

function clampWidth(w: number): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(w)));
}

export const useSessionHistoryStore = create<SessionHistoryState>((set) => ({
  sessions: [],
  activeSessionId: null,
  searchQuery: { ...DEFAULT_SEARCH },
  sidebarOpen: true,
  sidebarWidth: DEFAULT_WIDTH,
  sidebarMode: getInitialMode(),
  isLoading: false,
  error: null,

  setSessions: (sessions) => set({ sessions }),

  selectSession: (id) => set({ activeSessionId: id }),

  deselectSession: () => set({ activeSessionId: null }),

  setSearchQuery: (partial) =>
    set((s) => ({
      searchQuery: { ...s.searchQuery, ...partial },
    })),

  resetSearchQuery: () => set({ searchQuery: { ...DEFAULT_SEARCH } }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSidebarWidth: (width) =>
    set({ sidebarWidth: clampWidth(width) }),

  setSidebarMode: (mode) => set({ sidebarMode: mode }),

  updateSessionTitle: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === id ? { ...ses, title } : ses,
      ),
    })),

  updateSessionTags: (id, tags) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === id ? { ...ses, tags } : ses,
      ),
    })),

  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((ses) => ses.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      sessions: [],
      activeSessionId: null,
      searchQuery: { ...DEFAULT_SEARCH },
      sidebarOpen: true,
      sidebarWidth: DEFAULT_WIDTH,
      sidebarMode: getInitialMode(),
      isLoading: false,
      error: null,
    }),
}));

// Selectors

export function selectSortedSessions(
  sessions: SessionSummary[],
): SessionSummary[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function selectFilteredSessions(
  sessions: SessionSummary[],
  query: SearchQuery,
): SessionSummary[] {
  const sorted = selectSortedSessions(sessions);

  return sorted.filter((s) => {
    if (query.text) {
      const q = query.text.toLowerCase();
      const inTitle = s.title.toLowerCase().includes(q);
      const inPreview = s.firstMessagePreview.toLowerCase().includes(q);
      if (!inTitle && !inPreview) return false;
    }
    if (query.dateRange) {
      const { start, end } = query.dateRange;
      if (start != null && s.createdAt < start) return false;
      if (end != null && s.createdAt > end) return false;
    }
    if (query.statusFilter && query.statusFilter.length > 0) {
      if (!query.statusFilter.includes(s.status)) return false;
    }
    if (query.tagsFilter && query.tagsFilter.length > 0) {
      if (!query.tagsFilter.some((t) => s.tags.includes(t))) return false;
    }
    return true;
  });
}

export function selectSessionTags(sessions: SessionSummary[]): string[] {
  const tagSet = new Set<string>();
  for (const s of sessions) {
    for (const tag of s.tags) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
}

export type { SessionStatus, SearchQuery };
