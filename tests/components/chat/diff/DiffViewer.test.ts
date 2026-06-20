import { describe, expect, it } from "vitest";
import { renderDiffViewer } from "../../../../packages/web/src/components/chat/diff/DiffViewer";

const SAMPLE_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 import { bar } from './bar';
-import { oldDep } from './old';
+import { newDep } from './new';
+import { extra } from './extra';
 context line here
@@ -10,4 +11,3 @@
 function main() {
-  oldFunction();
+  newFunction();
   return 0;
`;

describe("renderDiffViewer", () => {
  it("renders a diff viewer from unified diff string", () => {
    const { html, getState } = renderDiffViewer({
      diff: SAMPLE_DIFF,
      filePath: "src/foo.ts",
      language: "typescript",
    });

    expect(html).toContain("diff-viewer");
    expect(html).toContain("src/foo.ts");
    expect(html).toContain("Unified");
    expect(html).toContain("Split");

    const state = getState();
    expect(state.hunks.length).toBeGreaterThan(0);
    expect(state.viewMode).toBe("unified");
  });

  it("accepts old/new content pair", () => {
    const { html, getState } = renderDiffViewer({
      oldContent: "line1\nline2\nline3\n",
      newContent: "line1\nline2_modified\nline3\n",
      filePath: "test.txt",
    });

    expect(html).toContain("diff-viewer");
    const state = getState();
    expect(state.hunks.length).toBeGreaterThan(0);
  });

  it("renders statistics when enabled", () => {
    const { html } = renderDiffViewer({
      diff: SAMPLE_DIFF,
      showStatistics: true,
    });

    expect(html).toContain("diff-statistics");
  });

  it("hides statistics when disabled", () => {
    const { html } = renderDiffViewer({
      diff: SAMPLE_DIFF,
      showStatistics: false,
    });

    expect(html).not.toContain("diff-statistics");
  });

  it("shows navigation when diff is large and enabled", () => {
    const lines = Array.from({ length: 100 }, (_, i) =>
      i % 10 === 5 ? `-line ${i}\n+modified line ${i}` : ` line ${i}`,
    ).join("\n");
    const largeDiff = `@@ -1,100 +1,100 @@\n${lines}`;

    const { html } = renderDiffViewer({
      diff: largeDiff,
      showNavigation: true,
    });

    expect(html).toContain("diff-nav-controls");
  });

  it("uses default view mode from props", () => {
    const { getState } = renderDiffViewer({
      diff: SAMPLE_DIFF,
      defaultViewMode: "split",
    });

    expect(getState().viewMode).toBe("split");
  });

  it("handles empty diff gracefully", () => {
    const { html, getState } = renderDiffViewer({ diff: "" });
    expect(html).toContain("diff-viewer");
    expect(getState().hunks).toEqual([]);
  });

  it("handles identical old/new content", () => {
    const { html, getState } = renderDiffViewer({
      oldContent: "same",
      newContent: "same",
    });
    expect(html).toContain("diff-viewer");
    expect(getState().hunks).toEqual([]);
  });
});
