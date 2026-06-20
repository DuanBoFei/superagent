import { describe, expect, it } from "vitest";
import { renderBashCard } from "../../packages/web/src/components/chat/cards/BashCard";
import { renderFileReadCard } from "../../packages/web/src/components/chat/cards/FileReadCard";
import { renderFileWriteCard } from "../../packages/web/src/components/chat/cards/FileWriteCard";
import { renderFileEditCard } from "../../packages/web/src/components/chat/cards/FileEditCard";
import { renderGrepCard } from "../../packages/web/src/components/chat/cards/GrepCard";
import { renderGlobCard } from "../../packages/web/src/components/chat/cards/GlobCard";
import { renderTaskListCard } from "../../packages/web/src/components/chat/cards/TaskListCard";
import { renderSubAgentGridCard } from "../../packages/web/src/components/chat/cards/SubAgentGridCard";
import { renderWebSearchCard } from "../../packages/web/src/components/chat/cards/WebSearchCard";
import { renderErrorCard, type ErrorCardState } from "../../packages/web/src/components/chat/cards/ErrorCard";
import type { BashCard, FileReadCard, FileWriteCard, FileEditCard, GrepCard, GlobCard, TaskListCard, SubAgentGridCard, WebSearchCard, GrepMatch } from "../../packages/web/src/types/cards";

const match: GrepMatch = { filePath: "src/foo.ts", line: 1, column: 1, matchText: "x", contextBefore: "", contextAfter: "" };

const fixtures: Record<string, any> = {
  bash: { id: "b1", type: "bash", status: "success", timestamp: 1, title: "ls", isExpanded: true, isCollapsible: true, content: { command: "ls", args: [], output: "file1\nfile2", exitCode: 0, durationMs: 100 } } as BashCard,
  fileRead: { id: "r1", type: "file-read", status: "success", timestamp: 1, title: "Read", isExpanded: true, isCollapsible: true, content: { filePath: "src/x.ts", fileSize: 100, lineCount: 10, content: "const x = 1;", language: "ts" } } as FileReadCard,
  fileWrite: { id: "w1", type: "file-write", status: "success", timestamp: 1, title: "Created", isExpanded: true, isCollapsible: false, content: { filePath: "x.json", linesWritten: 5, content: "{}" } } as FileWriteCard,
  fileEdit: { id: "e1", type: "file-edit", status: "success", timestamp: 1, title: "Edit", isExpanded: true, isCollapsible: true, content: { filePath: "x.ts", diff: "+added\n-removed", linesAdded: 1, linesRemoved: 1 } } as FileEditCard,
  grep: { id: "g1", type: "grep", status: "success", timestamp: 1, title: "Grep", isExpanded: true, isCollapsible: true, content: { pattern: "fn", matches: [match], totalMatches: 1, filesSearched: 2 } } as GrepCard,
  glob: { id: "gl1", type: "glob", status: "success", timestamp: 1, title: "Glob", isExpanded: true, isCollapsible: true, content: { pattern: "*.ts", files: ["a.ts", "b.ts"], totalFiles: 2 } } as GlobCard,
  taskList: { id: "t1", type: "task-list", status: "success", timestamp: 1, title: "Tasks", isExpanded: true, isCollapsible: false, content: { tasks: [{ taskId: "1", title: "Task 1", status: "pending" }], completedCount: 0, totalCount: 1 } } as TaskListCard,
  subAgentGrid: { id: "s1", type: "sub-agent-grid", status: "success", timestamp: 1, title: "Agents", isExpanded: true, isCollapsible: false, content: { cells: [{ agentId: "a1", title: "Agent 1", status: "running", output: "", progress: 50 }], columns: 1 } } as SubAgentGridCard,
  webSearch: { id: "ws1", type: "web-search", status: "success", timestamp: 1, title: "Search", isExpanded: true, isCollapsible: true, content: { query: "test", results: [{ title: "R1", url: "https://x.com", snippet: "S1", source: "x.com" }], totalResults: 1 } } as WebSearchCard,
};

const errorFix: ErrorCardState = { id: "err1", status: "error", timestamp: 1, title: "Error", isExpanded: true, content: { errorType: "Err", message: "fail", stackTrace: "stack" } };

describe("T017 card performance", () => {
  it("renders all 9 card types within 50ms per card", () => {
    const renderers: [string, () => string][] = [
      ["bash", () => renderBashCard(fixtures.bash)],
      ["fileRead", () => renderFileReadCard(fixtures.fileRead)],
      ["fileWrite", () => renderFileWriteCard(fixtures.fileWrite)],
      ["fileEdit", () => renderFileEditCard(fixtures.fileEdit)],
      ["grep", () => renderGrepCard(fixtures.grep)],
      ["glob", () => renderGlobCard(fixtures.glob)],
      ["taskList", () => renderTaskListCard(fixtures.taskList)],
      ["subAgentGrid", () => renderSubAgentGridCard(fixtures.subAgentGrid)],
      ["webSearch", () => renderWebSearchCard(fixtures.webSearch)],
      ["error", () => renderErrorCard(errorFix)],
    ];

    for (const [name, fn] of renderers) {
      const start = performance.now();
      const html = fn();
      const elapsed = performance.now() - start;
      expect(html.length, `${name}: output should not be empty`).toBeGreaterThan(0);
      expect(elapsed, `${name}: render should be < 50ms`).toBeLessThan(50);
    }
  });

  it("all card types use consistent border-radius and spacing tokens", () => {
    const outputs = [
      renderBashCard(fixtures.bash),
      renderFileReadCard(fixtures.fileRead),
      renderFileEditCard(fixtures.fileEdit),
      renderGrepCard(fixtures.grep),
      renderGlobCard(fixtures.glob),
      renderWebSearchCard(fixtures.webSearch),
    ];

    for (const html of outputs) {
      // All content panels should use rounded + border-neutral-800 + bg-neutral-950
      expect(html).toMatch(/rounded/);
      expect(html).toMatch(/border-neutral-800/);
      expect(html).toMatch(/bg-neutral-950/);
      expect(html).toMatch(/px-3\s+py-2/);
    }
  });

  it("all card types escape HTML to prevent XSS", () => {
    const outputs = [
      renderBashCard({ ...fixtures.bash, content: { ...fixtures.bash.content, output: "<script>alert(1)</script>" } }),
      renderFileReadCard({ ...fixtures.fileRead, content: { ...fixtures.fileRead.content, filePath: "<img onerror=alert(1)>" } }),
      renderGrepCard({ ...fixtures.grep, content: { ...fixtures.grep.content, pattern: "<b>bold</b>" } }),
    ];

    for (const html of outputs) {
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<img");
      expect(html).not.toContain("<b>");
    }
  });

  it("large content cards stay well under 50ms", () => {
    const bigOutput = "line\n".repeat(1000);
    const bigBash = { ...fixtures.bash, content: { ...fixtures.bash.content, output: bigOutput } };

    const start = performance.now();
    const html = renderBashCard(bigBash);
    const elapsed = performance.now() - start;

    expect(html.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });
});
