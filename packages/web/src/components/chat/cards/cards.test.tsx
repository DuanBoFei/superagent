import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ToolCard } from "./ToolCard";
import { ErrorCard } from "./ErrorCard";
import { BashCard } from "./BashCard";
import { FileReadCard } from "./FileReadCard";
import { FileWriteCard } from "./FileWriteCard";
import { FileEditCard } from "./FileEditCard";
import { GrepCard } from "./GrepCard";
import { GlobCard } from "./GlobCard";
import { TaskListCard } from "./TaskListCard";
import { SubAgentGridCard } from "./SubAgentGridCard";
import { WebSearchCard } from "./WebSearchCard";
import { createCardComponentRegistry } from "./CardRegistry";
import type {
  BaseCardState,
  BashCard as BashCardType,
  FileReadCard as FileReadCardType,
  FileWriteCard as FileWriteCardType,
  FileEditCard as FileEditCardType,
  GrepCard as GrepCardType,
  GlobCard as GlobCardType,
  TaskListCard as TaskListCardType,
  SubAgentGridCard as SubAgentGridCardType,
  WebSearchCard as WebSearchCardType,
} from "../../../types/cards";
import type { ErrorCardState } from "./ErrorCard";

// ── Helpers ───────────────────────────────────────────

function baseCard(overrides?: Partial<BaseCardState>): BaseCardState {
  return {
    id: "card-1",
    type: "bash",
    status: "success",
    timestamp: 1700000000000,
    title: "Test Card",
    isExpanded: true,
    isCollapsible: true,
    ...overrides,
  };
}

// ── ToolCard ──────────────────────────────────────────

describe("ToolCard", () => {
  it("renders type label and title", () => {
    render(<ToolCard card={baseCard({ type: "bash" })}>body</ToolCard>);
    expect(screen.getByText("Bash")).toBeDefined();
    expect(screen.getByText("Test Card")).toBeDefined();
  });

  it("renders children when expanded", () => {
    render(<ToolCard card={baseCard({ isExpanded: true })}><span data-testid="body">hello</span></ToolCard>);
    expect(screen.getByTestId("body")).toBeDefined();
  });

  it("hides children when collapsed", () => {
    render(<ToolCard card={baseCard({ isExpanded: false })}><span data-testid="body">hello</span></ToolCard>);
    expect(screen.queryByTestId("body")).toBeNull();
  });

  it("renders status dot with correct aria-label", () => {
    render(<ToolCard card={baseCard({ status: "running" })}>body</ToolCard>);
    const dot = screen.getByRole("img", { name: "Running" });
    expect(dot).toBeDefined();
    expect(dot.className).toContain("bg-amber-400");
    expect(dot.className).toContain("animate-pulse");
  });

  it("renders copy button and calls onCopy", () => {
    const onCopy = vi.fn();
    render(<ToolCard card={baseCard()} onCopy={onCopy}>body</ToolCard>);
    const btn = screen.getByLabelText("Copy card content");
    fireEvent.click(btn);
    expect(onCopy).toHaveBeenCalledWith("card-1");
  });

  it("renders collapse toggle button and calls onToggle", () => {
    const onToggle = vi.fn();
    render(<ToolCard card={baseCard({ isCollapsible: true })} onToggle={onToggle}>body</ToolCard>);
    const btn = screen.getByLabelText("Collapse card");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith("card-1");
  });

  it("toggles aria-expanded correctly", () => {
    render(<ToolCard card={baseCard({ isCollapsible: true, isExpanded: true })}>body</ToolCard>);
    expect(screen.getByLabelText("Collapse card").getAttribute("aria-expanded")).toBe("true");
  });

  it("hides toggle button when not collapsible", () => {
    render(<ToolCard card={baseCard({ isCollapsible: false })}>body</ToolCard>);
    expect(screen.queryByLabelText("Collapse card")).toBeNull();
    expect(screen.queryByLabelText("Expand card")).toBeNull();
  });

  it("renders data attributes on container", () => {
    render(<ToolCard card={baseCard({ id: "abc", type: "grep" })}>body</ToolCard>);
    const container = document.querySelector(".card-container");
    expect(container?.getAttribute("data-card-id")).toBe("abc");
    expect(container?.getAttribute("data-card-type")).toBe("grep");
  });

  it("renders timestamp in YYYY-MM-DD HH:MM:SS format", () => {
    render(<ToolCard card={baseCard({ timestamp: 1700000000000 })}>body</ToolCard>);
    expect(screen.getByText("2023-11-14 22:13:20")).toBeDefined();
  });

  it("renders all type labels", () => {
    const types: Array<BaseCardState["type"]> = ["bash", "file-read", "file-write", "file-edit", "grep", "glob", "task-list", "sub-agent-grid", "web-search"];
    for (const t of types) {
      const { unmount } = render(<ToolCard card={baseCard({ type: t })}>body</ToolCard>);
      unmount();
    }
  });

  it("uses raw type as label for unknown types", () => {
    render(<ToolCard card={baseCard({ type: "unknown" as never })}>body</ToolCard>);
    expect(screen.getByText("unknown")).toBeDefined();
  });
});

// ── ErrorCard ─────────────────────────────────────────

const errorCard: ErrorCardState = {
  id: "err-1",
  status: "error",
  timestamp: 1700000000000,
  title: "Something went wrong",
  isExpanded: true,
  content: {
    errorType: "TypeError",
    message: "Cannot read properties of null",
    stackTrace: "at Object.<anonymous> (file.ts:10:5)\n  at run (index.ts:3:2)",
  },
};

describe("ErrorCard", () => {
  it("renders error type and message", () => {
    render(<ErrorCard card={errorCard} />);
    expect(screen.getByText("TypeError")).toBeDefined();
    expect(screen.getByText("Cannot read properties of null")).toBeDefined();
  });

  it("has red left border", () => {
    render(<ErrorCard card={errorCard} />);
    const el = document.querySelector(".error-card");
    expect(el?.className).toContain("border-red-600");
  });

  it("shows stack trace toggle button when stack exists", () => {
    render(<ErrorCard card={errorCard} />);
    expect(screen.getByText("Show stack trace")).toBeDefined();
  });

  it("shows stack trace on click", () => {
    render(<ErrorCard card={errorCard} />);
    fireEvent.click(screen.getByText("Show stack trace"));
    expect(screen.getByText("Hide stack trace")).toBeDefined();
    const pre = document.querySelector(".error-stack");
    expect(pre).toBeDefined();
    expect(pre?.textContent).toContain("at Object.<anonymous>");
  });

  it("hides toggle when no stack trace", () => {
    const noStack = { ...errorCard, content: { ...errorCard.content, stackTrace: "" } };
    render(<ErrorCard card={noStack} />);
    expect(screen.queryByText("Show stack trace")).toBeNull();
  });

  it("calls onCopy when copy button clicked", () => {
    const onCopy = vi.fn();
    render(<ErrorCard card={errorCard} onCopy={onCopy} />);
    fireEvent.click(screen.getByText("Copy error details"));
    expect(onCopy).toHaveBeenCalledWith("err-1");
  });
});

// ── BashCard ──────────────────────────────────────────

const bashCard: BashCardType = {
  ...baseCard({ type: "bash", title: "npm test" }),
  content: {
    command: "npm",
    args: ["test", "--", "--reporter=verbose"],
    output: "PASS  src/app.test.ts\n  ✓ renders (12ms)\n\nTests: 1 passed",
    exitCode: 0,
    durationMs: 1234,
  },
};

describe("BashCard", () => {
  it("renders full command with $ prefix", () => {
    render(<BashCard card={bashCard} />);
    const el = document.querySelector(".bash-command");
    expect(el?.textContent).toContain("$ npm test -- --reporter=verbose");
  });

  it("renders exit code 0 in green", () => {
    render(<BashCard card={bashCard} />);
    const exit = screen.getByText("Exit: 0");
    expect(exit).toBeDefined();
    expect(exit.className).toContain("text-emerald-400");
  });

  it("renders non-zero exit code in red", () => {
    const failed = { ...bashCard, content: { ...bashCard.content, exitCode: 1 } };
    render(<BashCard card={failed} />);
    const exit = screen.getByText("Exit: 1");
    expect(exit.className).toContain("text-red-400");
  });

  it("shows Exit: -- when exit code is null", () => {
    const pending = { ...bashCard, content: { ...bashCard.content, exitCode: null } };
    render(<BashCard card={pending} />);
    expect(screen.getByText("Exit: --")).toBeDefined();
  });

  it("displays formatted duration", () => {
    render(<BashCard card={bashCard} />);
    expect(screen.getByText("1.2s")).toBeDefined();
  });

  it("displays ms for sub-second duration", () => {
    const fast = { ...bashCard, content: { ...bashCard.content, durationMs: 340 } };
    render(<BashCard card={fast} />);
    expect(screen.getByText("340ms")).toBeDefined();
  });

  it("shows -- for null duration", () => {
    const noDur = { ...bashCard, content: { ...bashCard.content, durationMs: null } };
    render(<BashCard card={noDur} />);
    expect(screen.getByText("--")).toBeDefined();
  });
});

// ── FileReadCard ──────────────────────────────────────

const fileReadCard: FileReadCardType = {
  ...baseCard({ type: "file-read", title: "Read src/app.ts" }),
  content: {
    filePath: "src/app.ts",
    fileSize: 2048,
    lineCount: 15,
    content: "import React from 'react';\nconst App = () => <div>hi</div>;\nexport default App;",
    language: "typescript",
  },
};

describe("FileReadCard", () => {
  it("renders file path and metadata", () => {
    render(<FileReadCard card={fileReadCard} />);
    expect(screen.getByText("src/app.ts")).toBeDefined();
    expect(screen.getByText("2.0KB")).toBeDefined();
    expect(screen.getByText("15 lines")).toBeDefined();
    expect(screen.getByText("typescript")).toBeDefined();
  });

  it("renders code lines with line numbers", () => {
    render(<FileReadCard card={fileReadCard} />);
    const nums = document.querySelectorAll(".read-line-num");
    expect(nums.length).toBe(3);
    expect(nums[0].textContent).toBe("1");
  });

  it("renders bytes format under 1KB", () => {
    const small = { ...fileReadCard, content: { ...fileReadCard.content, fileSize: 512 } };
    render(<FileReadCard card={small} />);
    expect(screen.getByText("512B")).toBeDefined();
  });

  it("shows collapse button for long content", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i}`);
    const long = { ...fileReadCard, content: { ...fileReadCard.content, content: lines.join("\n"), lineCount: 60 } };
    render(<FileReadCard card={long} />);
    expect(screen.getByText("Show all 60 lines")).toBeDefined();
  });
});

// ── FileWriteCard ─────────────────────────────────────

const fileWriteCard: FileWriteCardType = {
  ...baseCard({ type: "file-write", title: "Write src/new.ts" }),
  content: {
    filePath: "src/new.ts",
    linesWritten: 5,
    content: "export function add(a: number, b: number): number {\n  return a + b;\n}",
  },
};

describe("FileWriteCard", () => {
  it("renders New badge", () => {
    render(<FileWriteCard card={fileWriteCard} />);
    expect(screen.getByText("New")).toBeDefined();
  });

  it("renders file path and line count", () => {
    render(<FileWriteCard card={fileWriteCard} />);
    expect(screen.getByText("src/new.ts")).toBeDefined();
    expect(screen.getByText("5 lines")).toBeDefined();
  });

  it("renders code with line numbers", () => {
    render(<FileWriteCard card={fileWriteCard} />);
    const els = document.querySelectorAll(".write-line-num");
    expect(els.length).toBe(3);
  });

  it("uses emerald border for content area", () => {
    render(<FileWriteCard card={fileWriteCard} />);
    const pre = document.querySelector(".write-content");
    expect(pre?.className).toContain("border-emerald-900/40");
  });
});

// ── FileEditCard ──────────────────────────────────────

const fileEditCard: FileEditCardType = {
  ...baseCard({ type: "file-edit", title: "Edit src/app.ts" }),
  content: {
    filePath: "src/app.ts",
    diff: "@@ -1,3 +1,4 @@\n-const x = 1;\n+const x = 2;\n+const y = 3;\n unchanged",
    linesAdded: 2,
    linesRemoved: 1,
  },
};

describe("FileEditCard", () => {
  it("renders file path and change counts", () => {
    render(<FileEditCard card={fileEditCard} />);
    expect(screen.getByText("src/app.ts")).toBeDefined();
    expect(screen.getByText("+2")).toBeDefined();
    expect(screen.getByText("-1")).toBeDefined();
  });

  it("renders added lines with green styling", () => {
    render(<FileEditCard card={fileEditCard} />);
    const added = document.querySelectorAll(".edit-added");
    expect(added.length).toBe(2);
    expect(added[0].className).toContain("bg-emerald-950/40");
    expect(added[0].className).toContain("text-emerald-300");
  });

  it("renders removed lines with red styling", () => {
    render(<FileEditCard card={fileEditCard} />);
    const removed = document.querySelectorAll(".edit-removed");
    expect(removed.length).toBe(1);
    expect(removed[0].className).toContain("bg-red-950/40");
    expect(removed[0].className).toContain("text-red-300");
  });

  it("renders hunk headers with neutral color", () => {
    render(<FileEditCard card={fileEditCard} />);
    const hunk = document.querySelector(".edit-hunk");
    expect(hunk).toBeDefined();
    expect(hunk?.className).toContain("text-neutral-500");
  });

  it("shows collapse button for long diffs", () => {
    const longLines = Array.from({ length: 120 }, (_, i) => (i % 2 === 0 ? `+line ${i}` : `-line ${i}`));
    const long = { ...fileEditCard, content: { ...fileEditCard.content, diff: longLines.join("\n") } };
    render(<FileEditCard card={long} />);
    expect(screen.getByText("Show full diff (120 lines)")).toBeDefined();
  });
});

// ── GrepCard ──────────────────────────────────────────

const grepCard: GrepCardType = {
  ...baseCard({ type: "grep", title: "Search for 'const'" }),
  content: {
    pattern: "const",
    matches: [
      { filePath: "src/app.ts", line: 1, column: 1, matchText: "const", contextBefore: "import React;\n", contextAfter: " x = 1;" },
      { filePath: "src/app.ts", line: 5, column: 10, matchText: "const", contextBefore: "", contextAfter: " y = 2;" },
      { filePath: "src/utils.ts", line: 3, column: 5, matchText: "const", contextBefore: "// helper\n", contextAfter: " z = 3;" },
    ],
    totalMatches: 3,
    filesSearched: 2,
  },
};

describe("GrepCard", () => {
  it("renders pattern and match counts", () => {
    render(<GrepCard card={grepCard} />);
    expect(screen.getByText("/const/")).toBeDefined();
    expect(screen.getByText("3 matches")).toBeDefined();
    expect(screen.getByText("in 2 files")).toBeDefined();
  });

  it("renders file path headers", () => {
    render(<GrepCard card={grepCard} />);
    expect(screen.getByText("src/app.ts")).toBeDefined();
    expect(screen.getByText("src/utils.ts")).toBeDefined();
  });

  it("highlights match text in amber", () => {
    render(<GrepCard card={grepCard} />);
    const highlights = document.querySelectorAll(".grep-match-text");
    expect(highlights.length).toBe(3);
    expect(highlights[0].className).toContain("text-amber-300");
    expect(highlights[0].className).toContain("font-bold");
  });

  it("renders line numbers", () => {
    render(<GrepCard card={grepCard} />);
    const nums = document.querySelectorAll(".grep-line-num");
    expect(nums.length).toBe(3);
    expect(nums[0].textContent).toBe("1");
  });

  it("renders single file label", () => {
    const oneFile = { ...grepCard, content: { ...grepCard.content, filesSearched: 1 } };
    render(<GrepCard card={oneFile} />);
    expect(screen.getByText("in 1 file")).toBeDefined();
  });
});

// ── GlobCard ──────────────────────────────────────────

const globCard: GlobCardType = {
  ...baseCard({ type: "glob", title: "Find *.ts files" }),
  content: {
    pattern: "src/**/*.ts",
    files: ["src/app.ts", "src/utils.ts", "src/components/"],
    totalFiles: 3,
  },
};

describe("GlobCard", () => {
  it("renders pattern and total count", () => {
    render(<GlobCard card={globCard} />);
    expect(screen.getByText("src/**/*.ts")).toBeDefined();
    expect(screen.getByText("3 files")).toBeDefined();
  });

  it("renders file list with names", () => {
    render(<GlobCard card={globCard} />);
    expect(screen.getByText("src/app.ts")).toBeDefined();
    expect(screen.getByText("src/utils.ts")).toBeDefined();
    expect(screen.getByText("src/components/")).toBeDefined();
  });

  it("renders singular file label", () => {
    const one = { ...globCard, content: { ...globCard.content, totalFiles: 1 } };
    render(<GlobCard card={one} />);
    expect(screen.getByText("1 file")).toBeDefined();
  });

  it("renders folder icon for paths ending with /", () => {
    render(<GlobCard card={globCard} />);
    expect(screen.getByText("📁")).toBeDefined();
  });

  it("shows collapse button for 30+ files", () => {
    const many = { ...globCard, content: { ...globCard.content, files: Array.from({ length: 35 }, (_, i) => `src/file${i}.ts`), totalFiles: 35 } };
    render(<GlobCard card={many} />);
    expect(screen.getByText("Show all 35 files")).toBeDefined();
  });
});

// ── TaskListCard ──────────────────────────────────────

const taskListCard: TaskListCardType = {
  ...baseCard({ type: "task-list", title: "Tasks" }),
  content: {
    tasks: [
      { taskId: "t1", title: "Do thing 1", status: "completed" },
      { taskId: "t2", title: "Do thing 2", status: "in-progress" },
      { taskId: "t3", title: "Do thing 3", status: "pending" },
      { taskId: "t4", title: "Do thing 4", status: "deleted" },
    ],
    completedCount: 1,
    totalCount: 4,
  },
};

describe("TaskListCard", () => {
  it("renders progress count", () => {
    render(<TaskListCard card={taskListCard} />);
    expect(screen.getByText("1/4")).toBeDefined();
  });

  it("renders progress bar with correct width", () => {
    render(<TaskListCard card={taskListCard} />);
    const fill = document.querySelector(".task-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });

  it("renders 0% when no tasks", () => {
    const empty = { ...taskListCard, content: { ...taskListCard.content, tasks: [], completedCount: 0, totalCount: 0 } };
    render(<TaskListCard card={empty} />);
    const fill = document.querySelector(".task-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("renders all task titles", () => {
    render(<TaskListCard card={taskListCard} />);
    expect(screen.getByText("Do thing 1")).toBeDefined();
    expect(screen.getByText("Do thing 2")).toBeDefined();
    expect(screen.getByText("Do thing 3")).toBeDefined();
    expect(screen.getByText("Do thing 4")).toBeDefined();
  });

  it("applies line-through to completed tasks", () => {
    render(<TaskListCard card={taskListCard} />);
    const cols = document.querySelectorAll(".task-row");
    expect(cols[0].className).toContain("line-through");
  });

  it("applies line-through to deleted tasks", () => {
    render(<TaskListCard card={taskListCard} />);
    const cols = document.querySelectorAll(".task-row");
    expect(cols[3].className).toContain("line-through");
  });
});

// ── SubAgentGridCard ──────────────────────────────────

const subAgentGridCard: SubAgentGridCardType = {
  ...baseCard({ type: "sub-agent-grid", title: "Sub-Agents" }),
  content: {
    cells: [
      { agentId: "a1", title: "Read file", status: "success", output: "", progress: 100 },
      { agentId: "a2", title: "Search code", status: "running", output: "Searching...", progress: 60 },
      { agentId: "a3", title: "Lint check", status: "error", output: "ESLint failed", progress: 0 },
      { agentId: "a4", title: "Wait", status: "pending", output: "", progress: 0 },
    ],
    columns: 2,
  },
};

describe("SubAgentGridCard", () => {
  it("renders all cell titles", () => {
    render(<SubAgentGridCard card={subAgentGridCard} />);
    expect(screen.getByText("Read file")).toBeDefined();
    expect(screen.getByText("Search code")).toBeDefined();
    expect(screen.getByText("Lint check")).toBeDefined();
    expect(screen.getByText("Wait")).toBeDefined();
  });

  it("renders 2-column grid", () => {
    render(<SubAgentGridCard card={subAgentGridCard} />);
    const grid = document.querySelector(".sub-agent-grid");
    expect(grid?.className).toContain("grid-cols-2");
  });

  it("renders 1-column grid when columns=1", () => {
    const oneCol = { ...subAgentGridCard, content: { ...subAgentGridCard.content, columns: 1 } };
    render(<SubAgentGridCard card={oneCol} />);
    const grid = document.querySelector(".sub-agent-grid");
    expect(grid?.className).toContain("grid-cols-1");
  });

  it("renders progress bar for running cells with progress > 0", () => {
    render(<SubAgentGridCard card={subAgentGridCard} />);
    const bars = document.querySelectorAll(".cell-progress-bar");
    expect(bars.length).toBe(1);
  });

  it("renders progress percentage text for running cells", () => {
    render(<SubAgentGridCard card={subAgentGridCard} />);
    expect(screen.getByText("60%")).toBeDefined();
  });

  it("renders cell output when present", () => {
    render(<SubAgentGridCard card={subAgentGridCard} />);
    expect(screen.getByText("Searching...")).toBeDefined();
    expect(screen.getByText("ESLint failed")).toBeDefined();
  });

  it("applies colored left border by status", () => {
    render(<SubAgentGridCard card={subAgentGridCard} />);
    const cells = document.querySelectorAll(".sub-agent-cell");
    expect(cells[0].className).toContain("border-l-emerald-500");
    expect(cells[1].className).toContain("border-l-amber-500");
    expect(cells[2].className).toContain("border-l-red-500");
  });
});

// ── WebSearchCard ─────────────────────────────────────

const webSearchCard: WebSearchCardType = {
  ...baseCard({ type: "web-search", title: "Search results" }),
  content: {
    query: "React hooks best practices",
    results: [
      { title: "React Docs", url: "https://react.dev", snippet: "Official React docs", source: "react.dev" },
      { title: "Best Practices", url: "https://example.com", snippet: "A guide to hooks", source: "example.com" },
    ],
    totalResults: 2,
  },
};

describe("WebSearchCard", () => {
  it("renders query label", () => {
    render(<WebSearchCard card={webSearchCard} />);
    expect(screen.getByText("React hooks best practices")).toBeDefined();
  });

  it("renders result count", () => {
    render(<WebSearchCard card={webSearchCard} />);
    expect(screen.getByText("2 results")).toBeDefined();
  });

  it("renders result titles as links", () => {
    render(<WebSearchCard card={webSearchCard} />);
    const link1 = screen.getByText("React Docs");
    expect(link1).toBeDefined();
    const link2 = screen.getByText("Best Practices");
    expect(link2).toBeDefined();
  });

  it("links have correct attributes", () => {
    render(<WebSearchCard card={webSearchCard} />);
    const links = document.querySelectorAll(".search-result-title");
    expect(links[0].getAttribute("href")).toBe("https://react.dev");
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[0].getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders source and snippet", () => {
    render(<WebSearchCard card={webSearchCard} />);
    expect(screen.getByText("react.dev")).toBeDefined();
    expect(screen.getByText("Official React docs")).toBeDefined();
  });

  it("renders singular result label", () => {
    const one = { ...webSearchCard, content: { ...webSearchCard.content, totalResults: 1 } };
    render(<WebSearchCard card={one} />);
    expect(screen.getByText("1 result")).toBeDefined();
  });

  it("shows collapse button for 5+ results", () => {
    const results = Array.from({ length: 6 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.com/${i}`,
      snippet: `Snippet ${i}`,
      source: `src${i}`,
    }));
    const many = { ...webSearchCard, content: { ...webSearchCard.content, results, totalResults: 6 } };
    render(<WebSearchCard card={many} />);
    expect(screen.getByText("Show all 6 results")).toBeDefined();
  });
});

// ── CardRegistry ──────────────────────────────────────

describe("CardRegistry", () => {
  const DummyCard = ({ card }: { card: { id: string; title: string } }) => (
    <span data-testid="dummy">{card.title}</span>
  );

  it("registers and retrieves a component", () => {
    const reg = createCardComponentRegistry();
    reg.register("bash", DummyCard);
    expect(reg.get("bash")).toBe(DummyCard);
    expect(reg.has("bash")).toBe(true);
  });

  it("returns undefined for unregistered type", () => {
    const reg = createCardComponentRegistry();
    expect(reg.get("grep")).toBeUndefined();
    expect(reg.has("grep")).toBe(false);
  });

  it("renders registered component", () => {
    const reg = createCardComponentRegistry();
    reg.register("bash", DummyCard);
    const card = baseCard({ type: "bash", title: "Hello World" });
    const node = reg.render(card as never);
    const { container } = render(<>{node}</>);
    expect(screen.getByTestId("dummy")).toBeDefined();
    expect(screen.getByText("Hello World")).toBeDefined();
  });

  it("renders fallback for unregistered type", () => {
    const reg = createCardComponentRegistry();
    const card = baseCard({ type: "grep", title: "No component" });
    const node = reg.render(card as never);
    const { container } = render(<>{node}</>);
    expect(screen.getByText("[grep]")).toBeDefined();
    expect(screen.getByText("No component")).toBeDefined();
  });

  it("passes onToggle and onCopy to rendered component", () => {
    const onToggle = vi.fn();
    const onCopy = vi.fn();
    const SpyCard = ({ card, onToggle: ot, onCopy: oc }: { card: unknown; onToggle?: (id: string) => void; onCopy?: (id: string) => void }) => (
      <button data-testid="spy" onClick={() => { ot?.("x"); oc?.("x"); }}>click</button>
    );
    const reg = createCardComponentRegistry();
    reg.register("bash", SpyCard);
    const card = baseCard({ type: "bash" });
    const node = reg.render(card as never, onToggle, onCopy);
    render(<>{node}</>);
    fireEvent.click(screen.getByTestId("spy"));
    expect(onToggle).toHaveBeenCalledWith("x");
    expect(onCopy).toHaveBeenCalledWith("x");
  });
});
