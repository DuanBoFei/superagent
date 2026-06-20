import { describe, expect, it, beforeEach } from "vitest";
import { createDiffSlice } from "../../../../packages/web/src/store/slices/diff.slice";
import type { DiffSlice, DiffStorageLike } from "../../../../packages/web/src/store/slices/diff.slice";

function createFakeStorage(): DiffStorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("createDiffSlice", () => {
  let storage: DiffStorageLike;
  let slice: DiffSlice;

  beforeEach(() => {
    storage = createFakeStorage();
    slice = createDiffSlice(storage);
  });

  it("defaults to unified view mode", () => {
    expect(slice.getState().viewMode).toBe("unified");
  });

  it("switches to split view mode", () => {
    slice.setViewMode("split");
    expect(slice.getState().viewMode).toBe("split");
  });

  it("persists view mode preference", () => {
    slice.setViewMode("split");

    const slice2 = createDiffSlice(storage);
    expect(slice2.getState().viewMode).toBe("split");
  });

  it("toggles hunk collapsed state", () => {
    slice.toggleHunkCollapsed(0);
    expect(slice.getState().collapsedHunks.has(0)).toBe(true);

    slice.toggleHunkCollapsed(0);
    expect(slice.getState().collapsedHunks.has(0)).toBe(false);
  });

  it("collapses all specified hunks", () => {
    slice.collapseAll([0, 2, 4]);
    const collapsed = slice.getState().collapsedHunks;
    expect(collapsed.has(0)).toBe(true);
    expect(collapsed.has(2)).toBe(true);
    expect(collapsed.has(4)).toBe(true);
    expect(collapsed.has(1)).toBe(false);
  });

  it("expands all collapsed hunks", () => {
    slice.collapseAll([0, 2]);
    slice.expandAll();
    expect(slice.getState().collapsedHunks.size).toBe(0);
  });

  it("navigates to next hunk", () => {
    const result = slice.getNextHunk(5);
    expect(result).toBe(1);
    expect(slice.getState().currentHunkIndex).toBe(1);
  });

  it("does not navigate past the last hunk", () => {
    slice.navigateToHunk(4);
    const result = slice.getNextHunk(5);
    expect(result).toBe(4);
    expect(slice.getState().currentHunkIndex).toBe(4);
  });

  it("navigates to previous hunk", () => {
    slice.navigateToHunk(3);
    const result = slice.getPrevHunk(5);
    expect(result).toBe(2);
    expect(slice.getState().currentHunkIndex).toBe(2);
  });

  it("does not navigate before the first hunk", () => {
    const result = slice.getPrevHunk(5);
    expect(result).toBe(0);
    expect(slice.getState().currentHunkIndex).toBe(0);
  });

  it("resets state correctly", () => {
    slice.setViewMode("split");
    slice.collapseAll([0, 1]);
    slice.navigateToHunk(3);

    slice.reset(10);

    expect(slice.getState().viewMode).toBe("split");
    expect(slice.getState().collapsedHunks.size).toBe(0);
    expect(slice.getState().currentHunkIndex).toBe(0);
  });
});
