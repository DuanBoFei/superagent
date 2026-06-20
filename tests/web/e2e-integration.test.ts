import { describe, expect, it } from "vitest";
import { createCardRegistry } from "../../packages/web/src/components/chat/cards/CardRegistry";
import { createCardsSlice } from "../../packages/web/src/store/slices/cards.slice";
import { createToolCardDispatcher } from "../../packages/web/src/hooks/use-tool-cards";
import { renderCards } from "../../packages/web/src/components/chat/cards/CardRenderer";
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
import { createAnsiParser } from "../../packages/web/src/lib/ansi-parser";

function createStorage() {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
}

// ── T020 E2E: Complete agent session simulation ─────────────────────

describe("T020 E2E full agent session", () => {
  it("simulates a bug-fix session: grep → read → edit → bash → all 4 cards render", () => {
    const storage = createStorage();
    const cards = createCardsSlice(storage);
    const dispatch = createToolCardDispatcher(cards);
    const registry = createCardRegistry();

    // Register all renderers
    registry.register("bash", renderBashCard as any);
    registry.register("file-read", renderFileReadCard as any);
    registry.register("file-write", renderFileWriteCard as any);
    registry.register("file-edit", renderFileEditCard as any);
    registry.register("grep", renderGrepCard as any);
    registry.register("glob", renderGlobCard as any);
    registry.register("task-list", renderTaskListCard as any);
    registry.register("sub-agent-grid", renderSubAgentGridCard as any);
    registry.register("web-search", renderWebSearchCard as any);

    // Step 1: Grep to find the bug location
    dispatch.dispatchToolStart({ toolCallId: "call_grep", toolName: "Grep", title: "grep handleSubmit", timestamp: 1 });
    dispatch.dispatchToolOutput({ toolCallId: "call_grep", content: "src/login.ts:42:  function handleSubmit" });
    dispatch.dispatchToolComplete({ toolCallId: "call_grep", status: "success" });

    // Step 2: Read the file at the bug location
    dispatch.dispatchToolStart({ toolCallId: "call_read", toolName: "Read", title: "Read src/login.ts", timestamp: 2 });
    dispatch.dispatchToolOutput({ toolCallId: "call_read", content: "export function handleSubmit(e: Event) {\n  const data = new FormData(e.target);\n  await login(data);\n}" });
    dispatch.dispatchToolComplete({ toolCallId: "call_read", status: "success" });

    // Step 3: Edit to fix the missing async
    dispatch.dispatchToolStart({ toolCallId: "call_edit", toolName: "Edit", title: "Edit src/login.ts", timestamp: 3 });
    dispatch.dispatchToolComplete({ toolCallId: "call_edit", status: "success" });
    // Manually update the edit card content to reflect what the edit tool actually did
    cards.updateCard("call_edit", {
      content: { filePath: "src/login.ts", diff: "+async function handleSubmit(e: Event) {\n-export function handleSubmit(e: Event) {", linesAdded: 1, linesRemoved: 1 },
    } as any);

    // Step 4: Run tests to verify the fix
    dispatch.dispatchToolStart({ toolCallId: "call_bash", toolName: "Bash", title: "npm test -- login", timestamp: 4 });
    dispatch.dispatchToolOutput({ toolCallId: "call_bash", content: "PASS  src/login.test.ts\n  login flow\n    ✓ should handle async submit (42ms)\n\nTests: 1 passed, 1 total\n" });
    dispatch.dispatchToolComplete({ toolCallId: "call_bash", status: "success" });

    // Verify all 4 cards exist
    expect(cards.getAllCards()).toHaveLength(4);
    expect(cards.getCard("call_grep")!.type).toBe("grep");
    expect(cards.getCard("call_read")!.type).toBe("file-read");
    expect(cards.getCard("call_edit")!.type).toBe("file-edit");
    expect(cards.getCard("call_bash")!.type).toBe("bash");

    // Verify all 4 cards completed successfully
    for (const id of ["call_grep", "call_read", "call_edit", "call_bash"]) {
      expect(cards.getCard(id)!.status).toBe("success");
    }

    // Render all cards through the renderer
    const allCards = cards.snapshot();
    const html = renderCards(allCards, registry);
    expect(html).toContain("grep handleSubmit");
    expect(html).toContain("Read src/login.ts");
    expect(html).toContain("Edit src/login.ts");
    expect(html).toContain("npm test -- login");
  });

  it("simulates an error flow: tool_error creates error card", () => {
    const cards = createCardsSlice(createStorage());
    const dispatch = createToolCardDispatcher(cards);

    dispatch.dispatchToolStart({ toolCallId: "call_fail", toolName: "Bash", title: "rm -rf /tmp/build", timestamp: 1 });
    dispatch.dispatchToolError({
      toolCallId: "call_fail",
      errorType: "PermissionDeniedError",
      message: "Root directory access denied",
      stackTrace: "Error: PermissionDeniedError\n    at BashTool.execute (bash.ts:142)\n    at ToolOrchestrator.run (orchestrator.ts:87)",
    });

    const card = cards.getCard("call_fail");
    expect(card!.status).toBe("error");

    // Render as error card
    const errorCard: ErrorCardState = {
      id: "call_fail", status: "error", timestamp: 1,
      title: "rm -rf /tmp/build", isExpanded: true,
      content: {
        errorType: "PermissionDeniedError",
        message: "Root directory access denied",
        stackTrace: "Error: PermissionDeniedError\n    at BashTool.execute (bash.ts:142)\n    at ToolOrchestrator.run (orchestrator.ts:87)",
      },
    };
    const html = renderErrorCard(errorCard);
    expect(html).toContain("PermissionDeniedError");
    expect(html).toContain("BashTool.execute");
  });

  it("all 9 card types render in a single vertical stack", () => {
    const registry = createCardRegistry();
    registry.register("bash", renderBashCard as any);
    registry.register("file-read", renderFileReadCard as any);
    registry.register("file-write", renderFileWriteCard as any);
    registry.register("file-edit", renderFileEditCard as any);
    registry.register("grep", renderGrepCard as any);
    registry.register("glob", renderGlobCard as any);
    registry.register("task-list", renderTaskListCard as any);
    registry.register("sub-agent-grid", renderSubAgentGridCard as any);
    registry.register("web-search", renderWebSearchCard as any);

    const cards = createCardsSlice(createStorage());
    const dispatch = createToolCardDispatcher(cards);

    // Fire all 9 tool starts
    const tools: [string, string, string][] = [
      ["call_bash", "Bash", "ls -la"],
      ["call_read", "Read", "Read config.ts"],
      ["call_write", "Write", "Write new-file.ts"],
      ["call_edit", "Edit", "Edit old-file.ts"],
      ["call_grep", "Grep", "grep TODO"],
      ["call_glob", "Glob", "glob *.ts"],
      ["call_task", "Task", "Tasks"],
      ["call_agent", "SubAgent", "Explore agent"],
      ["call_search", "WebSearch", "Search TypeScript docs"],
    ];

    for (const [id, name, title] of tools) {
      dispatch.dispatchToolStart({ toolCallId: id, toolName: name, title, timestamp: 1 });
      dispatch.dispatchToolComplete({ toolCallId: id, status: "success" });
    }

    expect(cards.getAllCards()).toHaveLength(9);

    const html = renderCards(cards.snapshot(), registry);
    expect(html.length).toBeGreaterThan(0);
    // Each card title should appear
    for (const [,, title] of tools) {
      expect(html).toContain(title);
    }
  });

  it("3 parallel tools render vertically and maintain independent state", () => {
    const registry = createCardRegistry();
    registry.register("bash", renderBashCard as any);
    registry.register("grep", renderGrepCard as any);
    registry.register("glob", renderGlobCard as any);

    const cards = createCardsSlice(createStorage());
    const dispatch = createToolCardDispatcher(cards);

    // Start 3 parallel read-only tools
    dispatch.dispatchToolStart({ toolCallId: "a1", toolName: "Grep", title: "grep auth", timestamp: 1 });
    dispatch.dispatchToolStart({ toolCallId: "a2", toolName: "Glob", title: "glob *.spec.ts", timestamp: 1 });
    dispatch.dispatchToolStart({ toolCallId: "a3", toolName: "Bash", title: "npm run lint", timestamp: 1 });

    // Complete them independently
    dispatch.dispatchToolOutput({ toolCallId: "a3", content: "Checking formatting...\nAll matched files use Biome code style!\n" });
    dispatch.dispatchToolComplete({ toolCallId: "a1", status: "success" });
    dispatch.dispatchToolComplete({ toolCallId: "a2", status: "success" });
    dispatch.dispatchToolComplete({ toolCallId: "a3", status: "success" });

    // All 3 independent, different types
    expect(cards.getCard("a1")!.type).toBe("grep");
    expect(cards.getCard("a2")!.type).toBe("glob");
    expect(cards.getCard("a3")!.type).toBe("bash");

    // Toggle expanded on one card doesn't affect others
    cards.toggleExpanded("a1");
    expect(cards.getCard("a1")!.isExpanded).toBe(false);
    expect(cards.getCard("a2")!.isExpanded).toBe(true);
    expect(cards.getCard("a3")!.isExpanded).toBe(true);

    // Render all 3
    const html = renderCards(cards.snapshot(), registry);
    expect(html).toContain("grep auth");
    expect(html).toContain("glob *.spec.ts");
    expect(html).toContain("npm run lint");
  });

  it("1000-line bash output renders in under 50ms", () => {
    const bigOutput = Array.from({ length: 1000 }, (_, i) => `line ${i}: some output here`).join("\n");
    const card = {
      id: "big", type: "bash" as const, status: "success" as const, timestamp: 1,
      title: "Big Output", isExpanded: true, isCollapsible: true,
      content: { command: "generate", args: [], output: bigOutput, exitCode: 0, durationMs: 100 },
    };
    const start = performance.now();
    const html = renderBashCard(card);
    const elapsed = performance.now() - start;
    expect(html.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });

  it("collapsed state is persisted to storage on toggle", () => {
    const storage = createStorage();
    const cards = createCardsSlice(storage);

    cards.addCard({
      id: "p1", type: "bash" as const, status: "success" as const, timestamp: 1,
      title: "Persist", isExpanded: true, isCollapsible: true,
      content: { command: "ls", args: [], output: "ok", exitCode: 0, durationMs: 0 },
    } as any);

    // Collapse it
    cards.toggleExpanded("p1");
    expect(cards.getCard("p1")!.isExpanded).toBe(false);

    // Verify storage has the collapsed state (key: superagent_card_<id>, value: JSON)
    const stored = storage.getItem("superagent_card_p1");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({ collapsed: true });

    // Expand again
    cards.toggleExpanded("p1");
    expect(cards.getCard("p1")!.isExpanded).toBe(true);
    const stored2 = storage.getItem("superagent_card_p1");
    expect(JSON.parse(stored2!)).toEqual({ collapsed: false });
  });

  it("clearCards resets all state", () => {
    const cards = createCardsSlice(createStorage());
    const dispatch = createToolCardDispatcher(cards);

    dispatch.dispatchToolStart({ toolCallId: "c1", toolName: "Bash", title: "test1", timestamp: 1 });
    dispatch.dispatchToolStart({ toolCallId: "c2", toolName: "Read", title: "test2", timestamp: 1 });
    expect(cards.getAllCards()).toHaveLength(2);

    cards.clearCards();
    expect(cards.getAllCards()).toHaveLength(0);

    // New cards can be added after clear
    dispatch.dispatchToolStart({ toolCallId: "c3", toolName: "Bash", title: "test3", timestamp: 2 });
    expect(cards.getAllCards()).toHaveLength(1);
  });

  it("handles rapid-fire tool_start → tool_complete without output", () => {
    const registry = createCardRegistry();
    registry.register("bash", renderBashCard as any);
    const cards = createCardsSlice(createStorage());
    const dispatch = createToolCardDispatcher(cards);

    for (let i = 0; i < 20; i++) {
      dispatch.dispatchToolStart({ toolCallId: `fast_${i}`, toolName: "Bash", title: `cmd ${i}`, timestamp: i });
      dispatch.dispatchToolComplete({ toolCallId: `fast_${i}`, status: "success" });
    }

    expect(cards.getAllCards()).toHaveLength(20);

    // All snapshots render without error
    const html = renderCards(cards.snapshot(), registry);
    expect(html.length).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) {
      expect(html).toContain(`cmd ${i}`);
    }
  });

  it("ANSI-parsed bash output renders correctly through full pipeline", () => {
    const parser = createAnsiParser();

    // Simulate streaming bash output with ANSI codes
    const chunks = [
      "\x1b[32m✓\x1b[0m Running tests...\n",
      "\x1b[1m\x1b[33mWARN\x1b[0m deprecated API usage\n",
      "\x1b[31m✗\x1b[0m 1 test failed\n",
    ];

    let allHtml = "";
    for (const chunk of chunks) {
      allHtml += parser.append(chunk);
    }

    expect(allHtml).toContain("✓");
    expect(allHtml).toContain("WARN");
    expect(allHtml).toContain("✗");

    // Put through BashCard renderer
    const card = {
      id: "ansi", type: "bash" as const, status: "success" as const, timestamp: 1,
      title: "Test Runner", isExpanded: true, isCollapsible: true,
      content: { command: "npm test", args: [], output: "\x1b[32m✓\x1b[0m Running tests...\n\x1b[1m\x1b[33mWARN\x1b[0m deprecated API usage\n\x1b[31m✗\x1b[0m 1 test failed\n", exitCode: 1, durationMs: 500 },
    };
    const html = renderBashCard(card);
    expect(html).toContain("✓");
    expect(html).toContain("WARN");
    expect(html).toContain("✗");
  });

  it("WebSearch card renders safe external links", () => {
    const card = {
      id: "ws", type: "web-search" as const, status: "success" as const, timestamp: 1,
      title: "Search: TypeScript generics", isExpanded: true, isCollapsible: true,
      content: {
        query: "TypeScript generics",
        results: [
          { title: "TypeScript Handbook", url: "https://typescriptlang.org/docs", snippet: "Official docs", source: "typescriptlang.org" },
          { title: "Generics Guide", url: "https://example.com/guide", snippet: "Learn generics", source: "example.com" },
        ],
        totalResults: 2,
      },
    };
    const html = renderWebSearchCard(card);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("typescriptlang.org");
    expect(html).toContain("example.com");
  });

  it("snapshot returns cards in insertion order (chronological)", () => {
    const cards = createCardsSlice(createStorage());
    const dispatch = createToolCardDispatcher(cards);

    dispatch.dispatchToolStart({ toolCallId: "s1", toolName: "Grep", title: "Step 1", timestamp: 100 });
    dispatch.dispatchToolStart({ toolCallId: "s2", toolName: "Read", title: "Step 2", timestamp: 200 });
    dispatch.dispatchToolStart({ toolCallId: "s3", toolName: "Edit", title: "Step 3", timestamp: 300 });
    dispatch.dispatchToolStart({ toolCallId: "s4", toolName: "Bash", title: "Step 4", timestamp: 400 });

    const snap = cards.snapshot();
    expect(snap.map(c => c.title)).toEqual(["Step 1", "Step 2", "Step 3", "Step 4"]);
  });

  it("full session: mixed success and error tools co-exist", () => {
    const registry = createCardRegistry();
    registry.register("bash", renderBashCard as any);
    registry.register("file-read", renderFileReadCard as any);
    registry.register("grep", renderGrepCard as any);
    const cards = createCardsSlice(createStorage());
    const dispatch = createToolCardDispatcher(cards);

    // Successful grep
    dispatch.dispatchToolStart({ toolCallId: "ok1", toolName: "Grep", title: "grep working", timestamp: 1 });
    dispatch.dispatchToolComplete({ toolCallId: "ok1", status: "success" });

    // Failed bash
    dispatch.dispatchToolStart({ toolCallId: "err1", toolName: "Bash", title: "broken command", timestamp: 2 });
    dispatch.dispatchToolError({ toolCallId: "err1", errorType: "ExecError", message: "command not found" });

    // Successful read
    dispatch.dispatchToolStart({ toolCallId: "ok2", toolName: "Read", title: "read config", timestamp: 3 });
    dispatch.dispatchToolOutput({ toolCallId: "ok2", content: "export default {" });
    dispatch.dispatchToolComplete({ toolCallId: "ok2", status: "success" });

    expect(cards.getCard("ok1")!.status).toBe("success");
    expect(cards.getCard("err1")!.status).toBe("error");
    expect(cards.getCard("ok2")!.status).toBe("success");

    // All 3 render
    const html = renderCards(cards.snapshot(), registry);
    expect(html).toContain("grep working");
    expect(html).toContain("broken command");
    expect(html).toContain("read config");
  });
});
