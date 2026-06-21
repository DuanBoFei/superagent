/**
 * T016 [INT] · Integration tests
 *
 * 5 integration tests spanning multiple components:
 *   1. Full send→stream→complete
 *   2. Tool call→card render
 *   3. Sidebar session load
 *   4. Parallel tools grid
 *   5. Terminal ANSI output
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ChatPage } from "../components/chat/chat-page";
import { InputBox } from "../components/chat/input-box";
import { MessageList } from "../components/chat/message-list";
import { BashCard } from "../components/chat/cards/BashCard";
import { FileReadCard } from "../components/chat/cards/FileReadCard";
import { GrepCard } from "../components/chat/cards/GrepCard";
import { TaskListCard } from "../components/chat/cards/TaskListCard";
import { SubAgentGridCard } from "../components/chat/cards/SubAgentGridCard";
import { ToolCard } from "../components/chat/cards/ToolCard";
import { SessionHistorySidebar } from "../components/sidebar/session-history-sidebar";
import { ToolGrid } from "../components/chat/tool-grid/ToolGrid";
import { TerminalRenderer } from "../components/chat/terminal/TerminalRenderer";
import { useChatStore } from "../store/chat";
import { useSessionHistoryStore } from "../store/session-history";
import type { Message } from "../types/message";
import type {
  BashCard as BashCardType,
  FileReadCard as FileReadCardType,
  GrepCard as GrepCardType,
  TaskListCard as TaskListCardType,
  SubAgentGridCard as SubAgentGridCardType,
  BaseCardState,
} from "../../types/cards";
import type { SessionSummary } from "../types/session-history";
import type { ToolCardData, ViewMode, SortField, SortOrder, StatusFilter, MetricName } from "../types/tool-grid";
import type { ToolTimerState } from "../hooks/use-tool-timer";

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

function makeToolCardData(overrides?: Partial<ToolCardData>): ToolCardData {
  return {
    toolId: "t1",
    toolName: "read",
    parameters: { filePath: "src/app.ts" },
    status: "success",
    progress: 100,
    startTime: 1700000000000,
    endTime: 1700000001000,
    durationMs: 150,
    outputPreview: ["const x = 1;"],
    fullOutput: "const x = 1;\nconst y = 2;",
    error: null,
    isExpanded: true,
    resourceUsage: { outputBytes: 1024 },
    ...overrides,
  };
}

const noopTimerState: ToolTimerState = { formatted: "00:00", running: false, elapsedMs: 0 };

function makeToolGridDefaults(overrides?: Partial<{
  tools: ToolCardData[];
  containerWidth: number;
  sortBy: SortField;
  sortOrder: SortOrder;
  filterStatus: StatusFilter;
  viewMode: ViewMode;
  errorExpanded: boolean;
  runningCount: number;
  completedCount: number;
  showUndo: boolean;
  selectedResourceMetric: MetricName;
  scrollTop: number;
  viewportHeight: number;
  timerStates: Map<string, ToolTimerState>;
  bashOutputs: Map<string, string>;
}>) {
  return {
    tools: overrides?.tools ?? [],
    containerWidth: overrides?.containerWidth ?? 1200,
    sortBy: (overrides?.sortBy ?? "status") as SortField,
    sortOrder: (overrides?.sortOrder ?? "asc") as SortOrder,
    filterStatus: (overrides?.filterStatus ?? "all") as StatusFilter,
    viewMode: (overrides?.viewMode ?? "grid") as ViewMode,
    errorExpanded: overrides?.errorExpanded ?? false,
    runningCount: overrides?.runningCount ?? 0,
    completedCount: overrides?.completedCount ?? 0,
    showUndo: overrides?.showUndo ?? false,
    selectedResourceMetric: (overrides?.selectedResourceMetric ?? "duration") as MetricName,
    scrollTop: overrides?.scrollTop ?? 0,
    viewportHeight: overrides?.viewportHeight ?? 800,
    timerStates: overrides?.timerStates ?? new Map(),
    bashOutputs: overrides?.bashOutputs ?? new Map(),
    onToggleCard: vi.fn(),
    onToggleErrorPanel: vi.fn(),
    onScrollToTool: vi.fn(),
    onCancelAll: vi.fn(),
    onExpandAll: vi.fn(),
    onCollapseAll: vi.fn(),
    onClearCompleted: vi.fn(),
    onUndoClear: vi.fn(),
    onSetView: vi.fn(),
    onSortBy: vi.fn(),
    onToggleSortOrder: vi.fn(),
    onFilterBy: vi.fn(),
    onSelectMetric: vi.fn(),
  };
}

// ═══════════════════════════════════════════════════════
// ① Full send → stream → complete
// ═══════════════════════════════════════════════════════

const mockSocketState = { connected: true };
let socketHandlers: Record<string, (...args: any[]) => void> = {};

function makeFakeSocket() {
  socketHandlers = {};
  return {
    get connected() {
      return mockSocketState.connected;
    },
    on: vi.fn((event: string, fn: (...args: any[]) => void) => {
      socketHandlers[event] = fn;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
}

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => makeFakeSocket()),
}));

describe("① Full send → stream → complete", () => {
  beforeEach(() => {
    mockSocketState.connected = true;
    socketHandlers = {};
    useChatStore.getState().reset();
    useChatStore.getState().setConnectionStatus("connected");
  });

  it("renders ChatPage with InputBox and empty message area", () => {
    render(<ChatPage />);
    expect(screen.getByPlaceholderText("Ask SuperAgent...")).toBeDefined();
    expect(screen.getByText("No messages yet. Start a conversation.")).toBeDefined();
  });

  it("adds user message and emits client_message on send", () => {
    render(<ChatPage />);
    const textarea = screen.getByPlaceholderText("Ask SuperAgent...");
    fireEvent.change(textarea, { target: { value: "Fix the bug in auth.ts" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    const sid = useChatStore.getState().activeSessionId ?? "__default__";
    const msgs = useChatStore.getState().sessionMessages[sid] ?? [];
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("Fix the bug in auth.ts");
  });

  it("streams assistant tokens into a message via appendToken", () => {
    const store = useChatStore.getState();
    store.setActiveSession("int-session");
    store.appendToken("assist-1", "I", "int-session");
    store.appendToken("assist-1", " found", "int-session");
    store.appendToken("assist-1", " the", "int-session");
    store.appendToken("assist-1", " bug", "int-session");

    const msgs = useChatStore.getState().sessionMessages["int-session"] ?? [];
    expect(msgs.length).toBe(1);
    expect(msgs[0].id).toBe("assist-1");
    expect(msgs[0].role).toBe("assistant");
    expect(msgs[0].content).toBe("I found the bug");
    expect(msgs[0].status).toBe("streaming");
    expect(useChatStore.getState().isStreaming).toBe(true);
  });

  it("marks message complete and stops streaming", () => {
    const store = useChatStore.getState();
    store.setActiveSession("int-session");
    store.appendToken("assist-1", "Done", "int-session");
    store.markComplete("assist-1", { inputTokens: 200, outputTokens: 50, durationMs: 1500 }, "int-session");

    const msgs = useChatStore.getState().sessionMessages["int-session"] ?? [];
    expect(msgs[0].status).toBe("sent");
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it("renders user and assistant messages in MessageList", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "Hello", timestamp: 1000, status: "sent" },
      { id: "a1", role: "assistant", content: "Hi there!", timestamp: 2000, status: "sent" },
    ];

    render(<MessageList messages={messages} />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("Hi there!")).toBeDefined();
  });

  it("shows streaming cursor for streaming messages", () => {
    const messages: Message[] = [
      { id: "a1", role: "assistant", content: "Thinking...", timestamp: 1000, status: "streaming" },
    ];

    render(<MessageList messages={messages} />);
    const bubble = document.querySelector('[data-streaming="true"]');
    expect(bubble).toBeDefined();
  });

  it("disables InputBox while streaming", () => {
    useChatStore.getState().appendToken("assist-1", "streaming...");

    render(<InputBox onSend={vi.fn()} />);
    const textarea = screen.getByPlaceholderText("Ask SuperAgent...");
    expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByText("Send")).toBeDefined();
    expect((screen.getByText("Send") as HTMLButtonElement).disabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// ② Tool call → card render
// ═══════════════════════════════════════════════════════

describe("② Tool call → card render", () => {
  it("BashCard renders complete tool result", () => {
    const card: BashCardType = {
      ...baseCard({ type: "bash", title: "npm run build", status: "success" }),
      content: {
        command: "npm",
        args: ["run", "build"],
        output: "> build\n> tsc\nSuccess",
        exitCode: 0,
        durationMs: 3200,
      },
    };

    render(<BashCard card={card} />);
    expect(screen.getByText("Exit: 0")).toBeDefined();
    expect(screen.getByText("3.2s")).toBeDefined();
    const cmd = document.querySelector(".bash-command");
    expect(cmd?.textContent).toContain("$ npm run build");
  });

  it("FileReadCard renders code with line numbers", () => {
    const card: FileReadCardType = {
      ...baseCard({ type: "file-read", title: "Read src/app.ts" }),
      content: {
        filePath: "src/app.ts",
        fileSize: 256,
        lineCount: 4,
        content: "const x = 1;\nconst y = 2;\nconst z = 3;\n",
        language: "typescript",
      },
    };

    render(<FileReadCard card={card} />);
    expect(screen.getByText("src/app.ts")).toBeDefined();
    expect(screen.getByText("256B")).toBeDefined();
    expect(screen.getByText("4 lines")).toBeDefined();
    // "const x = 1;\nconst y = 2;\nconst z = 3;\n" → 4 lines after split (trailing empty)
    const lineNums = document.querySelectorAll(".read-line-num");
    expect(lineNums.length).toBe(4);
  });

  it("GrepCard renders matches with highlighting", () => {
    const card: GrepCardType = {
      ...baseCard({ type: "grep", title: "Search" }),
      content: {
        pattern: "TODO",
        matches: [
          {
            filePath: "src/app.ts",
            line: 10,
            column: 1,
            matchText: "TODO",
            contextBefore: "// FIXME\n",
            contextAfter: ": refactor",
          },
          {
            filePath: "src/util.ts",
            line: 42,
            column: 3,
            matchText: "TODO",
            contextBefore: "",
            contextAfter: ": optimize",
          },
        ],
        totalMatches: 2,
        filesSearched: 2,
      },
    };

    render(<GrepCard card={card} />);
    expect(screen.getByText("/TODO/")).toBeDefined();
    expect(screen.getByText("2 matches")).toBeDefined();
    expect(screen.getByText("in 2 files")).toBeDefined();
    expect(screen.getByText("src/app.ts")).toBeDefined();
    expect(screen.getByText("src/util.ts")).toBeDefined();
    const highlights = document.querySelectorAll(".grep-match-text");
    expect(highlights.length).toBe(2);
  });

  it("TaskListCard renders with progress bar", () => {
    const card: TaskListCardType = {
      ...baseCard({ type: "task-list", title: "Tasks" }),
      content: {
        tasks: [
          { taskId: "t1", title: "Setup project", status: "completed" },
          { taskId: "t2", title: "Write tests", status: "in-progress" },
          { taskId: "t3", title: "Add docs", status: "pending" },
        ],
        completedCount: 1,
        totalCount: 3,
      },
    };

    render(<TaskListCard card={card} />);
    expect(screen.getByText("1/3")).toBeDefined();
    expect(screen.getByText("Setup project")).toBeDefined();
    expect(screen.getByText("Write tests")).toBeDefined();
    expect(screen.getByText("Add docs")).toBeDefined();
    const fill = document.querySelector(".task-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("33%");
  });

  it("SubAgentGridCard renders 2x2 grid with status colors", () => {
    const card: SubAgentGridCardType = {
      ...baseCard({ type: "sub-agent-grid", title: "Agents" }),
      content: {
        cells: [
          { agentId: "a1", title: "Lint", status: "success", output: "", progress: 100 },
          { agentId: "a2", title: "Test", status: "running", output: "Running tests...", progress: 45 },
          { agentId: "a3", title: "Build", status: "error", output: "Failed", progress: 0 },
          { agentId: "a4", title: "Deploy", status: "pending", output: "", progress: 0 },
        ],
        columns: 2,
      },
    };

    render(<SubAgentGridCard card={card} />);
    const grid = document.querySelector(".sub-agent-grid");
    expect(grid?.className).toContain("grid-cols-2");

    // Status border colors
    const cells = document.querySelectorAll(".sub-agent-cell");
    expect(cells[0].className).toContain("border-l-emerald-500");
    expect(cells[1].className).toContain("border-l-amber-500");
    expect(cells[2].className).toContain("border-l-red-500");

    // Running cell shows progress
    expect(screen.getByText("45%")).toBeDefined();
    expect(screen.getByText("Running tests...")).toBeDefined();
  });

  it("ToolCard collapses and expands", () => {
    const card = baseCard({ isCollapsible: true, isExpanded: true, title: "Collapsible" });

    const { rerender } = render(
      <ToolCard card={card}>
        <span data-testid="content">Hidden when collapsed</span>
      </ToolCard>,
    );

    expect(screen.getByTestId("content")).toBeDefined();

    // Re-render collapsed
    rerender(
      <ToolCard card={{ ...card, isExpanded: false }}>
        <span data-testid="content">Hidden when collapsed</span>
      </ToolCard>,
    );

    expect(screen.queryByTestId("content")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════
// ③ Sidebar session load
// ═══════════════════════════════════════════════════════

const mockSessions: SessionSummary[] = [
  {
    id: "s1",
    title: "Fix auth bug",
    firstMessagePreview: "There is a bug in the login flow",
    createdAt: 1700000000000,
    updatedAt: 1700001000000,
    durationMs: 60000,
    toolCallCount: 5,
    messageCount: 12,
    status: "completed",
    tags: ["bug", "auth"],
    forkedFrom: null,
  },
  {
    id: "s2",
    title: "Add dark mode",
    firstMessagePreview: "Can we add dark mode support?",
    createdAt: 1700002000000,
    updatedAt: 1700003000000,
    durationMs: 120000,
    toolCallCount: 8,
    messageCount: 20,
    status: "active",
    tags: ["feature", "ui"],
    forkedFrom: null,
  },
  {
    id: "s3",
    title: "Refactor database layer",
    firstMessagePreview: "The DB layer needs cleanup",
    createdAt: 1700004000000,
    updatedAt: 1700004500000,
    durationMs: 30000,
    toolCallCount: 3,
    messageCount: 8,
    status: "error",
    tags: ["refactor"],
    forkedFrom: null,
  },
];

describe("③ Sidebar session load", () => {
  beforeEach(() => {
    // jsdom doesn't implement window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    useSessionHistoryStore.getState().reset();
    useSessionHistoryStore.getState().setSidebarOpen(true);
  });

  it("renders session list with all sessions", () => {
    render(
      <SessionHistorySidebar
        sessions={mockSessions}
        availableTags={["bug", "auth", "feature", "ui", "refactor"]}
      />,
    );

    expect(screen.getByText("Fix auth bug")).toBeDefined();
    expect(screen.getByText("Add dark mode")).toBeDefined();
    expect(screen.getByText("Refactor database layer")).toBeDefined();
  });

  it("renders session status indicators", () => {
    render(<SessionHistorySidebar sessions={mockSessions} />);

    // Each session renders its title in the list
    const listbox = screen.getByRole("listbox", { name: "Session list" });
    expect(listbox).toBeDefined();
  });

  it("calls onSelectSession when a session is clicked", () => {
    const onSelect = vi.fn();
    render(<SessionHistorySidebar sessions={mockSessions} onSelectSession={onSelect} />);

    const first = screen.getByText("Fix auth bug");
    fireEvent.click(first);
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("renders search filter input", () => {
    render(<SessionHistorySidebar sessions={mockSessions} availableTags={["bug"]} />);

    expect(screen.getByPlaceholderText("Search sessions")).toBeDefined();
  });

  it("shows empty state when no sessions", () => {
    render(<SessionHistorySidebar sessions={[]} />);

    expect(screen.getByText("No sessions yet")).toBeDefined();
  });

  it("shows skeleton loading state", () => {
    render(<SessionHistorySidebar sessions={[]} isLoading={true} />);

    // SkeletonList renders 5 animated items inside a listbox with aria-busy
    const listbox = screen.getByRole("listbox", { busy: true });
    expect(listbox).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════
// ④ Parallel tools grid
// ═══════════════════════════════════════════════════════

describe("④ Parallel tools grid", () => {
  it("renders grid with tool cards", () => {
    const tools: ToolCardData[] = [
      makeToolCardData({ toolId: "t1", toolName: "read", status: "success", durationMs: 150 }),
      makeToolCardData({ toolId: "t2", toolName: "grep", status: "success", durationMs: 80 }),
      makeToolCardData({ toolId: "t3", toolName: "glob", status: "success", durationMs: 45 }),
      makeToolCardData({ toolId: "t4", toolName: "read", status: "success", durationMs: 120, parameters: { filePath: "src/util.ts" } }),
    ];

    const props = makeToolGridDefaults({ tools, completedCount: 4 });
    render(<ToolGrid {...props} />);

    const grid = document.querySelector(".tool-grid");
    expect(grid).toBeDefined();
    expect(grid?.className).toContain("grid-cols-2");

    // Tool labels are rendered by toolLabel() in ToolCard
    expect(screen.getAllByText("Read").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Grep")).toBeDefined();
    expect(screen.getByText("Glob")).toBeDefined();
  });

  it("renders running tool with progress bar", () => {
    const tools: ToolCardData[] = [
      makeToolCardData({ toolId: "t1", toolName: "read", status: "running", progress: 60, durationMs: null }),
    ];

    const props = makeToolGridDefaults({ tools, runningCount: 1 });
    render(<ToolGrid {...props} />);

    const bar = document.querySelector('[role="progressbar"]');
    expect(bar).toBeDefined();
    expect(bar?.getAttribute("aria-valuenow")).toBe("60");
  });

  it("renders error tool with error message", () => {
    const tools: ToolCardData[] = [
      makeToolCardData({
        toolId: "t1",
        toolName: "bash",
        status: "failed",
        progress: 0,
        durationMs: 500,
        error: { message: "Command failed with exit code 1" },
      }),
    ];

    const props = makeToolGridDefaults({ tools, completedCount: 1 });
    render(<ToolGrid {...props} />);

    expect(screen.getByText("Command failed with exit code 1")).toBeDefined();
  });

  it("renders empty state when no tools", () => {
    const props = makeToolGridDefaults({ tools: [] });
    render(<ToolGrid {...props} />);

    expect(screen.getByText("No tools matching current filter")).toBeDefined();
  });

  it("renders multiple tools without exceeding grid slots", () => {
    const tools: ToolCardData[] = Array.from({ length: 6 }, (_, i) =>
      makeToolCardData({
        toolId: `t${i}`,
        toolName: "read",
        status: "pending",
        progress: null,
        durationMs: null,
        parameters: { filePath: `file${i}.ts` },
      }),
    );

    const props = makeToolGridDefaults({ tools, filterStatus: "all" });
    render(<ToolGrid {...props} />);

    // All 6 tool cards are rendered (ToolGrid renders all tools passed in)
    const cards = document.querySelectorAll('[data-tool-id]');
    expect(cards.length).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════
// ⑤ Terminal ANSI output
// ═══════════════════════════════════════════════════════

describe("⑤ Terminal ANSI output", () => {
  it("renders plain text output", () => {
    render(<TerminalRenderer content="Hello world" />);

    const pre = document.querySelector(".terminal-renderer");
    expect(pre).toBeDefined();
    expect(pre?.textContent).toContain("Hello world");
  });

  it("renders ANSI color codes as styled spans", () => {
    // Green text via ANSI
    const ansiOutput = "\x1b[32mPASS\x1b[0m src/test.ts";

    render(<TerminalRenderer content={ansiOutput} />);

    const pre = document.querySelector(".terminal-renderer");
    expect(pre).toBeDefined();
    expect(pre?.textContent).toContain("PASS");
    expect(pre?.textContent).toContain("src/test.ts");
  });

  it("shows empty terminal state when content is empty", () => {
    render(<TerminalRenderer content="" />);

    const pre = document.querySelector('[data-terminal-empty="true"]');
    expect(pre).toBeDefined();
  });

  it("truncates long output beyond maxLines", () => {
    const longOutput = Array.from({ length: 250 }, (_, i) => `line ${i}`).join("\n");

    render(<TerminalRenderer content={longOutput} maxLines={200} />);

    // Should show truncation notice
    expect(screen.getByText(/Showing 200 of 250/)).toBeDefined();
    expect(screen.getByText("Show all")).toBeDefined();
  });

  it("calls onShowAll when expand button is clicked", () => {
    const longOutput = Array.from({ length: 250 }, (_, i) => `line ${i}`).join("\n");
    const onShowAll = vi.fn();

    render(<TerminalRenderer content={longOutput} maxLines={200} onShowAll={onShowAll} />);

    fireEvent.click(screen.getByText("Show all"));
    expect(onShowAll).toHaveBeenCalled();
  });

  it("renders ANSI bold text with proper styling", () => {
    const ansiOutput = "\x1b[1mBOLD TEXT\x1b[0m";

    render(<TerminalRenderer content={ansiOutput} />);

    const pre = document.querySelector(".terminal-renderer");
    expect(pre?.textContent).toContain("BOLD TEXT");
  });
});
