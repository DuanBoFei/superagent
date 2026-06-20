import { describe, expect, it } from "vitest";
import type {
  BaseCardState,
  BashCardContent,
  CardStatus,
  FileEditCardContent,
  FileReadCardContent,
  FileWriteCardContent,
  GlobCardContent,
  GrepCardContent,
  GrepMatch,
  SubAgentCell,
  SubAgentGridCardContent,
  TaskListCardContent,
  TaskListItem,
  ToolCardState,
  ToolCardType,
  WebSearchCardContent,
  WebSearchResult,
} from "../../packages/web/src/types/cards";

describe("tool card type contracts", () => {
  it("constrains ToolCardType to the 9 core card types", () => {
    const types: ToolCardType[] = [
      "bash",
      "file-read",
      "file-write",
      "file-edit",
      "grep",
      "glob",
      "task-list",
      "sub-agent-grid",
      "web-search",
    ];
    expect(types).toHaveLength(9);
  });

  it("constrains CardStatus to the 4 lifecycle statuses", () => {
    const statuses: CardStatus[] = ["pending", "running", "success", "error"];
    expect(statuses).toHaveLength(4);
  });

  it("constructs a valid BaseCardState", () => {
    const card: BaseCardState = {
      id: "tc_1",
      type: "bash",
      status: "running",
      timestamp: 1_720_000_000_000,
      title: "npm install",
      isExpanded: true,
      isCollapsible: true,
    };
    expect(card.id).toBe("tc_1");
  });

  it("constructs a BashCard with terminal-specific content", () => {
    const state: ToolCardState = {
      id: "tc_bash",
      type: "bash",
      status: "running",
      timestamp: 1_720_000_000_000,
      title: "npm test",
      isExpanded: true,
      isCollapsible: true,
      content: {
        command: "npm",
        args: ["test"],
        output: "[32mPASS[0m\n",
        exitCode: null,
        durationMs: null,
      } satisfies BashCardContent,
    };
    expect(state.type).toBe("bash");
    if (state.type === "bash") {
      expect(state.content.command).toBe("npm");
      expect(state.content.output).toContain("[32m");
    }
  });

  it("constructs a FileReadCard with file-specific content", () => {
    const state: ToolCardState = {
      id: "tc_read",
      type: "file-read",
      status: "success",
      timestamp: 1_720_000_000_000,
      title: "Read src/index.ts",
      isExpanded: false,
      isCollapsible: true,
      content: {
        filePath: "src/index.ts",
        fileSize: 2048,
        lineCount: 64,
        content: 'import http from "node:http";',
        language: "typescript",
      } satisfies FileReadCardContent,
    };
    if (state.type === "file-read") {
      expect(state.content.filePath).toBe("src/index.ts");
      expect(state.content.language).toBe("typescript");
    }
  });

  it("constructs a FileWriteCard with line-count metadata", () => {
    const state: ToolCardState = {
      id: "tc_write",
      type: "file-write",
      status: "success",
      timestamp: 1_720_000_000_000,
      title: "Created config.json",
      isExpanded: true,
      isCollapsible: false,
      content: {
        filePath: "config.json",
        linesWritten: 12,
        content: '{"key": "value"}',
      } satisfies FileWriteCardContent,
    };
    if (state.type === "file-write") {
      expect(state.content.linesWritten).toBe(12);
    }
  });

  it("constructs a FileEditCard with diff statistics", () => {
    const state: ToolCardState = {
      id: "tc_edit",
      type: "file-edit",
      status: "success",
      timestamp: 1_720_000_000_000,
      title: "Edited src/utils.ts",
      isExpanded: false,
      isCollapsible: true,
      content: {
        filePath: "src/utils.ts",
        diff: "@@ -1,3 +1,4 @@\n line\n+added\n-removed",
        linesAdded: 1,
        linesRemoved: 1,
      } satisfies FileEditCardContent,
    };
    if (state.type === "file-edit") {
      expect(state.content.linesAdded).toBe(1);
      expect(state.content.linesRemoved).toBe(1);
    }
  });

  it("constructs a GrepCard with grouped match results", () => {
    const match: GrepMatch = {
      filePath: "src/foo.ts",
      line: 42,
      column: 5,
      matchText: "function",
      contextBefore: "  ",
      contextAfter: " parse() {",
    };
    const state: ToolCardState = {
      id: "tc_grep",
      type: "grep",
      status: "success",
      timestamp: 1_720_000_000_000,
      title: "Grep: function",
      isExpanded: false,
      isCollapsible: true,
      content: {
        pattern: "function",
        matches: [match],
        totalMatches: 1,
        filesSearched: 3,
      } satisfies GrepCardContent,
    };
    if (state.type === "grep") {
      expect(state.content.pattern).toBe("function");
      expect(state.content.matches).toHaveLength(1);
      expect(state.content.matches[0].matchText).toBe("function");
    }
  });

  it("constructs a GlobCard with matched file list", () => {
    const state: ToolCardState = {
      id: "tc_glob",
      type: "glob",
      status: "success",
      timestamp: 1_720_000_000_000,
      title: "Glob: **/*.ts",
      isExpanded: true,
      isCollapsible: true,
      content: {
        pattern: "**/*.ts",
        files: ["src/a.ts", "src/b.ts"],
        totalFiles: 2,
      } satisfies GlobCardContent,
    };
    if (state.type === "glob") {
      expect(state.content.files).toContain("src/a.ts");
    }
  });

  it("constructs a TaskListCard with progress tracking", () => {
    const task: TaskListItem = {
      taskId: "t1",
      title: "Update parser",
      status: "in-progress",
    };
    const state: ToolCardState = {
      id: "tc_tasks",
      type: "task-list",
      status: "running",
      timestamp: 1_720_000_000_000,
      title: "Todo",
      isExpanded: true,
      isCollapsible: false,
      content: {
        tasks: [task],
        completedCount: 0,
        totalCount: 1,
      } satisfies TaskListCardContent,
    };
    if (state.type === "task-list") {
      expect(state.content.tasks[0].status).toBe("in-progress");
    }
  });

  it("constructs a SubAgentGridCard with parallel agent cells", () => {
    const cell: SubAgentCell = {
      agentId: "agent_1",
      title: "lint",
      status: "running",
      output: "Checking...",
      progress: 50,
    };
    const state: ToolCardState = {
      id: "tc_grid",
      type: "sub-agent-grid",
      status: "running",
      timestamp: 1_720_000_000_000,
      title: "Sub-agents",
      isExpanded: true,
      isCollapsible: false,
      content: {
        cells: [cell],
        columns: 2,
      } satisfies SubAgentGridCardContent,
    };
    if (state.type === "sub-agent-grid") {
      expect(state.content.cells[0].progress).toBe(50);
    }
  });

  it("constructs a WebSearchCard with structured results", () => {
    const result: WebSearchResult = {
      title: "Async Patterns",
      url: "https://example.com/async",
      snippet: "A guide to...",
      source: "example.com",
    };
    const state: ToolCardState = {
      id: "tc_search",
      type: "web-search",
      status: "success",
      timestamp: 1_720_000_000_000,
      title: "Web Search: TypeScript async",
      isExpanded: false,
      isCollapsible: true,
      content: {
        query: "TypeScript async patterns",
        results: [result],
        totalResults: 1,
      } satisfies WebSearchCardContent,
    };
    if (state.type === "web-search") {
      expect(state.content.results[0].url).toBe("https://example.com/async");
    }
  });

  it("narrows the discriminant union on ToolCardState.type", () => {
    const card: ToolCardState = {
      id: "tc_union",
      type: "bash",
      status: "error",
      timestamp: 1,
      title: "E",
      isExpanded: false,
      isCollapsible: false,
      content: { command: "", args: [], output: "", exitCode: 1, durationMs: 100 },
    };

    switch (card.type) {
      case "bash":
        card.content.exitCode satisfies number | null;
        break;
      case "file-read":
        card.content.lineCount satisfies number;
        break;
      case "file-write":
        card.content.linesWritten satisfies number;
        break;
      case "file-edit":
        card.content.linesAdded satisfies number;
        break;
      case "grep":
        card.content.pattern satisfies string;
        break;
      case "glob":
        card.content.files satisfies string[];
        break;
      case "task-list":
        card.content.totalCount satisfies number;
        break;
      case "sub-agent-grid":
        card.content.columns satisfies number;
        break;
      case "web-search":
        card.content.query satisfies string;
        break;
    }
    expect(card.status).toBe("error");
  });
});
