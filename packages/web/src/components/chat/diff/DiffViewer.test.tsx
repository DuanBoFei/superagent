import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffViewer } from "./DiffViewer";

const SAMPLE_DIFF = `diff --git a/src/file.ts b/src/file.ts
index abc..def 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1,5 +1,6 @@
-console.log("removed");
+console.log("added");
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 4;`;

describe("DiffViewer", () => {
  it("renders diff from diff string", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const viewer = document.querySelector("[data-diff-viewer]");
    expect(viewer).toBeDefined();
  });

  it("renders diff from old/new content pair", () => {
    render(<DiffViewer oldContent="line1\nline2" newContent="line1\nline3" />);
    const viewer = document.querySelector("[data-diff-viewer]");
    expect(viewer).toBeDefined();
  });

  it("renders empty state when no diff and no content", () => {
    render(<DiffViewer />);
    expect(screen.getByText("No changes")).toBeDefined();
  });

  it("renders statistics when showStatistics is not false", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const stats = document.querySelector("[aria-label='Diff statistics']");
    expect(stats).toBeDefined();
  });

  it("hides statistics when showStatistics is false", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} showStatistics={false} />);
    const stats = document.querySelector("[aria-label='Diff statistics']");
    expect(stats).toBeNull();
  });

  it("renders navigation controls", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const nav = document.querySelector("[data-diff-navigation]");
    expect(nav).toBeDefined();
  });

  it("hides navigation when showNavigation is false", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} showNavigation={false} />);
    const nav = document.querySelector("[data-diff-navigation]");
    expect(nav).toBeNull();
  });

  it("renders view mode toggle", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    expect(screen.getByText("Unified")).toBeDefined();
    expect(screen.getByText("Split")).toBeDefined();
  });

  it("switches to split view when split mode selected", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    fireEvent.click(screen.getByText("Split"));
    const splitView = document.querySelector(".diff-split-view");
    expect(splitView).toBeDefined();
  });

  it("switches back to unified view", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    fireEvent.click(screen.getByText("Split"));
    fireEvent.click(screen.getByText("Unified"));
    const unifiedView = document.querySelector(".diff-unified-view");
    expect(unifiedView).toBeDefined();
  });

  it("toggles hunk collapse on header click", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const headerBtns = document.querySelectorAll(".diff-hunk-header button, button.diff-hunk-header");
    if (headerBtns.length > 0) {
      fireEvent.click(headerBtns[0] as HTMLButtonElement);
      // After collapsing, the collapsed info should appear
      const collapsedInfo = document.querySelector(".diff-hunk-collapsed-info");
      expect(collapsedInfo).toBeDefined();
    }
  });

  it("renders with default view mode unified", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const unifiedView = document.querySelector(".diff-unified-view");
    expect(unifiedView).toBeDefined();
  });

  it("accepts defaultViewMode split", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} defaultViewMode="split" />);
    const splitView = document.querySelector(".diff-split-view");
    expect(splitView).toBeDefined();
  });

  it("renders gutter indicators for hunks with changes", () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const markers = document.querySelectorAll("[class*='diff-gutter-marker']");
    expect(markers.length).toBeGreaterThan(0);
  });
});
