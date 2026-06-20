import type { SessionSummary, SessionStatus, SearchQuery } from "../../types/session-history";
import type { SessionDbService } from "../../services/session-db.service";

export interface SessionHistorySlice {
  getSessions(): SessionSummary[];
  getFilters(): SearchQuery;
  getActiveSessionId(): string | null;
  getSidebarOpen(): boolean;
  getSidebarWidth(): number;
  getSidebarMode(): "dock" | "overlay";

  setFilters(partial: Partial<SearchQuery>): void;
  resetFilters(): void;
  toggleSidebar(): void;
  setSidebarWidth(width: number): void;
  setSidebarMode(mode: "dock" | "overlay"): void;

  selectSession(id: string): void;
  deselectSession(): void;
  refreshSessions(): Promise<void>;
  updateTags(sessionId: string, tags: string[]): Promise<void>;
  updateTitle(sessionId: string, title: string): Promise<void>;
}

const DEFAULT_FILTERS: SearchQuery = {
  text: "",
  dateRange: null,
  statusFilter: null,
  tagsFilter: null,
};

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 280;

export function createSessionHistorySlice(
  dbService: SessionDbService,
): SessionHistorySlice {
  let sessions: SessionSummary[] = [];
  let filters: SearchQuery = { ...DEFAULT_FILTERS };
  let activeSessionId: string | null = null;
  let sidebarOpen = true;
  let sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
  let sidebarMode: "dock" | "overlay" = "dock";

  return {
    getSessions: () => sessions,
    getFilters: () => ({ ...filters }),
    getActiveSessionId: () => activeSessionId,
    getSidebarOpen: () => sidebarOpen,
    getSidebarWidth: () => sidebarWidth,
    getSidebarMode: () => sidebarMode,

    setFilters(partial: Partial<SearchQuery>): void {
      filters = { ...filters, ...partial };
    },

    resetFilters(): void {
      filters = { ...DEFAULT_FILTERS };
    },

    toggleSidebar(): void {
      sidebarOpen = !sidebarOpen;
    },

    setSidebarWidth(width: number): void {
      sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
    },

    setSidebarMode(mode: "dock" | "overlay"): void {
      sidebarMode = mode;
    },

    selectSession(id: string): void {
      activeSessionId = id;
    },

    deselectSession(): void {
      activeSessionId = null;
    },

    async refreshSessions(): Promise<void> {
      sessions = await dbService.getSessionSummaries();
    },

    async updateTags(sessionId: string, tags: string[]): Promise<void> {
      const current = sessions.find((s) => s.id === sessionId);
      if (!current) return;

      const existing = new Set(current.tags);
      const desired = new Set(tags);

      for (const tag of existing) {
        if (!desired.has(tag)) {
          await dbService.removeTag(sessionId, tag);
        }
      }
      for (const tag of desired) {
        if (!existing.has(tag)) {
          await dbService.addTag(sessionId, tag);
        }
      }

      sessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, tags } : s,
      );
    },

    async updateTitle(sessionId: string, title: string): Promise<void> {
      await dbService.updateSession(sessionId, { title });
      sessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s,
      );
    },
  };
}
