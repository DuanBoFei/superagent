import type { DiffViewMode } from "../../types/diff";

export interface DiffStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DiffSliceState {
  viewMode: DiffViewMode;
  collapsedHunks: Set<number>;
  currentHunkIndex: number;
}

export interface DiffSlice {
  getState(): DiffSliceState;
  setViewMode(mode: DiffViewMode): void;
  toggleHunkCollapsed(hunkIndex: number): void;
  collapseAll(hunkIndices: number[]): void;
  expandAll(): void;
  navigateToHunk(hunkIndex: number): void;
  getNextHunk(totalHunks: number): number;
  getPrevHunk(totalHunks: number): number;
  reset(hunkCount: number): void;
}

const PREF_KEY = "superagent_diff_viewMode";

export function createDiffSlice(
  storage: DiffStorageLike,
  initialMode: DiffViewMode = "unified",
): DiffSlice {
  const state: DiffSliceState = {
    viewMode: loadPreference(storage, initialMode),
    collapsedHunks: new Set(),
    currentHunkIndex: 0,
  };

  return {
    getState(): DiffSliceState {
      return state;
    },

    setViewMode(mode: DiffViewMode): void {
      state.viewMode = mode;
      storage.setItem(PREF_KEY, mode);
    },

    toggleHunkCollapsed(hunkIndex: number): void {
      if (state.collapsedHunks.has(hunkIndex)) {
        state.collapsedHunks.delete(hunkIndex);
      } else {
        state.collapsedHunks.add(hunkIndex);
      }
    },

    collapseAll(hunkIndices: number[]): void {
      state.collapsedHunks = new Set(hunkIndices);
    },

    expandAll(): void {
      state.collapsedHunks.clear();
    },

    navigateToHunk(hunkIndex: number): void {
      state.currentHunkIndex = Math.max(0, hunkIndex);
    },

    getNextHunk(totalHunks: number): number {
      const next = state.currentHunkIndex + 1;
      if (next >= totalHunks) {
        return state.currentHunkIndex;
      }
      state.currentHunkIndex = next;
      return next;
    },

    getPrevHunk(totalHunks: number): number {
      const prev = state.currentHunkIndex - 1;
      if (prev < 0) {
        return state.currentHunkIndex;
      }
      state.currentHunkIndex = prev;
      return prev;
    },

    reset(hunkCount: number): void {
      state.collapsedHunks.clear();
      state.currentHunkIndex = 0;
    },
  };
}

function loadPreference(
  storage: DiffStorageLike,
  fallback: DiffViewMode,
): DiffViewMode {
  try {
    const stored = storage.getItem(PREF_KEY);
    if (stored === "unified" || stored === "split") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return fallback;
}
