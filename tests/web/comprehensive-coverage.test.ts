import { describe, expect, it } from "vitest";
import { createCardRegistry } from "../../packages/web/src/components/chat/cards/CardRegistry";
import { createCardsSlice } from "../../packages/web/src/store/slices/cards.slice";
import { createAnsiParser } from "../../packages/web/src/lib/ansi-parser";
import { renderBashCard } from "../../packages/web/src/components/chat/cards/BashCard";
import { renderFileEditCard } from "../../packages/web/src/components/chat/cards/FileEditCard";
import { renderWebSearchCard } from "../../packages/web/src/components/chat/cards/WebSearchCard";
import { renderErrorCard } from "../../packages/web/src/components/chat/cards/ErrorCard";
import { renderCards } from "../../packages/web/src/components/chat/cards/CardRenderer";
import { renderCardHeader } from "../../packages/web/src/components/chat/cards/CardHeader";
import type { BashCard, FileEditCard, WebSearchCard, ToolCardState } from "../../packages/web/src/types/cards";
import type { ErrorCardState } from "../../packages/web/src/components/chat/cards/ErrorCard";

function createStorage() {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
}

// ── CardRegistry extended tests ─────────────────────

describe("CardRegistry extended", () => {
  it("allows overwriting existing renderer (no throw)", () => {
    const registry = createCardRegistry();
    const fn1 = () => "a";
    const fn2 = () => "b";
    registry.register("bash", fn1);
    registry.register("bash", fn2); // overwrites silently
    expect(registry.hasRenderer("bash")).toBe(true);
  });

  it("renders fallback for unregistered types", () => {
    const registry = createCardRegistry();
    const card: ToolCardState = { id: "x", type: "bash", status: "success", timestamp: 1, title: "Test", isExpanded: true, isCollapsible: true, content: { command: "x", args: [], output: "", exitCode: 0, durationMs: 0 } };
    const html = registry.render(card);
    expect(html).toContain("bash");
  });

  it("lists all registered types", () => {
    const registry = createCardRegistry();
    registry.register("bash", () => "");
    registry.register("grep", () => "");
    expect(registry.getRegisteredTypes()).toEqual(["bash", "grep"]);
  });
});

// ── CardsSlice extended tests ─────────────────────

describe("CardsSlice extended", () => {
  it("toggleExpanded flips isExpanded", () => {
    const slice = createCardsSlice(createStorage());
    slice.addCard({ id: "c1", type: "bash", status: "success", timestamp: 1, title: "T", isExpanded: true, isCollapsible: true, content: { command: "", args: [], output: "", exitCode: 0, durationMs: 0 } } as BashCard);
    slice.toggleExpanded("c1");
    expect(slice.getCard("c1")!.isExpanded).toBe(false);
    slice.toggleExpanded("c1");
    expect(slice.getCard("c1")!.isExpanded).toBe(true);
  });

  it("clearCards empties all cards", () => {
    const slice = createCardsSlice(createStorage());
    slice.addCard({ id: "c1", type: "bash", status: "success", timestamp: 1, title: "T", isExpanded: true, isCollapsible: true, content: { command: "", args: [], output: "", exitCode: 0, durationMs: 0 } } as BashCard);
    slice.clearCards();
    expect(slice.getAllCards()).toHaveLength(0);
  });

  it("snapshot returns cards in insertion order", () => {
    const slice = createCardsSlice(createStorage());
    slice.addCard({ id: "a", type: "bash", status: "success", timestamp: 1, title: "A", isExpanded: true, isCollapsible: true, content: { command: "", args: [], output: "", exitCode: 0, durationMs: 0 } } as BashCard);
    slice.addCard({ id: "b", type: "bash", status: "success", timestamp: 1, title: "B", isExpanded: true, isCollapsible: true, content: { command: "", args: [], output: "", exitCode: 0, durationMs: 0 } } as BashCard);
    const snap = slice.snapshot();
    expect(snap).toHaveLength(2);
    expect(snap[0].id).toBe("a");
    expect(snap[1].id).toBe("b");
  });
});

// ── ANSI parser extended tests ─────────────────────

describe("ANSI parser extended", () => {
  it("handles empty append without crash", () => {
    const parser = createAnsiParser();
    expect(parser.append("")).toBe("");
  });

  it("resets correctly", () => {
    const parser = createAnsiParser();
    parser.append("hello");
    parser.reset();
    const result = parser.append("world");
    expect(result).toContain("world");
    // After reset, should not contain 'hello'
    expect(result).not.toContain("hello");
  });

  it("handles consecutive SGR codes", () => {
    const parser = createAnsiParser();
    const result = parser.append("\x1b[1m\x1b[31mbold red\x1b[0m");
    expect(result).toContain("bold red");
  });

  it("handles true color 24-bit sequences", () => {
    const parser = createAnsiParser();
    const result = parser.append("\x1b[38;2;255;128;0mtrue color\x1b[0m");
    expect(result).toContain("true color");
  });
});

// ── BashCard extended tests ─────────────────────

describe("BashCard extended", () => {
  it("shows duration when provided", () => {
    const card: BashCard = { id: "b1", type: "bash", status: "success", timestamp: 1, title: "ls", isExpanded: true, isCollapsible: true, content: { command: "ls", args: [], output: "ok", exitCode: 0, durationMs: 2500 } };
    const html = renderBashCard(card);
    expect(html).toContain("2.5s");
  });

  it("shows pending exit code when still running", () => {
    const card: BashCard = { id: "b1", type: "bash", status: "running", timestamp: 1, title: "long-cmd", isExpanded: true, isCollapsible: true, content: { command: "long-cmd", args: [], output: "processing...", exitCode: null, durationMs: null } };
    const html = renderBashCard(card);
    expect(html).toContain("exit-pending");
    expect(html).toContain("Exit: --");
  });

  it("shows exit code zero in green", () => {
    const card: BashCard = { id: "b1", type: "bash", status: "success", timestamp: 1, title: "ls", isExpanded: true, isCollapsible: true, content: { command: "ls", args: [], output: "ok", exitCode: 0, durationMs: 0 } };
    const html = renderBashCard(card);
    expect(html).toContain("exit-0");
    expect(html).toContain("Exit: 0");
  });
});

// ── FileEditCard extended tests ─────────────────────

describe("FileEditCard extended", () => {
  it("renders hunk headers with muted style", () => {
    const card: FileEditCard = { id: "e1", type: "file-edit", status: "success", timestamp: 1, title: "Edit", isExpanded: true, isCollapsible: true, content: { filePath: "x.ts", diff: "@@ -1,3 +1,4 @@\n context\n+added\n-removed", linesAdded: 1, linesRemoved: 1 } };
    const html = renderFileEditCard(card);
    expect(html).toContain("@@ -1,3 +1,4 @@");
    expect(html).toContain("edit-hunk");
  });

  it("handles empty diff content", () => {
    const card: FileEditCard = { id: "e2", type: "file-edit", status: "success", timestamp: 1, title: "Empty", isExpanded: true, isCollapsible: true, content: { filePath: "y.ts", diff: "", linesAdded: 0, linesRemoved: 0 } };
    const html = renderFileEditCard(card);
    expect(html).toContain("y.ts");
    expect(html).toContain("+0");
    expect(html).toContain("-0");
  });

  it("shows show-full-diff button for large diffs", () => {
    const bigDiff = Array.from({ length: 120 }, (_, i) => `+line ${i}`).join("\n");
    const card: FileEditCard = { id: "e3", type: "file-edit", status: "success", timestamp: 1, title: "Big", isExpanded: true, isCollapsible: true, content: { filePath: "big.ts", diff: bigDiff, linesAdded: 120, linesRemoved: 0 } };
    const html = renderFileEditCard(card);
    expect(html).toContain("Show full diff");
    expect(html).toContain("120 lines");
  });
});

// ── WebSearchCard extended tests ─────────────────────

describe("WebSearchCard extended", () => {
  it("renders links with rel=noopener", () => {
    const card: WebSearchCard = { id: "ws1", type: "web-search", status: "success", timestamp: 1, title: "S", isExpanded: true, isCollapsible: true, content: { query: "q", results: [{ title: "T", url: "https://x.com", snippet: "S", source: "x.com" }], totalResults: 1 } };
    const html = renderWebSearchCard(card);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("handles empty results", () => {
    const card: WebSearchCard = { id: "ws2", type: "web-search", status: "success", timestamp: 1, title: "Empty", isExpanded: true, isCollapsible: true, content: { query: "nothing", results: [], totalResults: 0 } };
    const html = renderWebSearchCard(card);
    expect(html).toContain("0 results");
  });
});

// ── ErrorCard extended tests ─────────────────────

describe("ErrorCard extended", () => {
  it("shows stack trace when expanded", () => {
    const card: ErrorCardState = { id: "e1", status: "error", timestamp: 1, title: "Boom", isExpanded: true, content: { errorType: "TypeError", message: "Cannot read null", stackTrace: "at foo (bar.ts:1)" } };
    const html = renderErrorCard(card);
    expect(html).toContain("at foo (bar.ts:1)");
  });

  it("hides stack when not provided", () => {
    const card: ErrorCardState = { id: "e2", status: "error", timestamp: 1, title: "Simple", isExpanded: true, content: { errorType: "Error", message: "Just a message" } };
    const html = renderErrorCard(card);
    expect(html).not.toContain("stack trace");
  });

  it("has red left border for visual emphasis", () => {
    const card: ErrorCardState = { id: "e3", status: "error", timestamp: 1, title: "Red", isExpanded: true, content: { errorType: "E", message: "M" } };
    const html = renderErrorCard(card);
    expect(html).toContain("border-l-2");
    expect(html).toContain("border-red-600");
  });
});

// ── CardRenderer edge cases ─────────────────────

describe("CardRenderer extended", () => {
  it("renders empty card list without error", () => {
    const registry = createCardRegistry();
    const html = renderCards([], registry);
    expect(html).toBe("");
  });

  it("renders multiple cards vertically", () => {
    const registry = createCardRegistry();
    registry.register("bash", renderBashCard as any);
    const cards: ToolCardState[] = [
      { id: "a", type: "bash", status: "success", timestamp: 1, title: "A", isExpanded: true, isCollapsible: true, content: { command: "a", args: [], output: "a", exitCode: 0, durationMs: 0 } } as BashCard,
      { id: "b", type: "bash", status: "success", timestamp: 2, title: "B", isExpanded: true, isCollapsible: true, content: { command: "b", args: [], output: "b", exitCode: 0, durationMs: 0 } } as BashCard,
    ];
    const html = renderCards(cards, registry);
    expect(html).toContain("A");
    expect(html).toContain("B");
  });
});

// ── CardHeader robustness ─────────────────────

describe("CardHeader extended", () => {
  it("renders header for every card type without error", () => {
    const types = ["bash", "file-read", "file-write", "file-edit", "grep", "glob", "task-list", "sub-agent-grid", "web-search"] as const;
    for (const type of types) {
      const header = { id: "h1", type, status: "success" as const, timestamp: 1, title: "Test", isExpanded: true, isCollapsible: true };
      const html = renderCardHeader(header);
      expect(html.length).toBeGreaterThan(0);
    }
  });

  it("renders all 4 status indicators distinctively", () => {
    const statuses = ["pending", "running", "success", "error"] as const;
    const set = new Set<string>();
    for (const status of statuses) {
      const header = { id: "h", type: "bash" as const, status, timestamp: 1, title: "T", isExpanded: true, isCollapsible: true };
      const html = renderCardHeader(header);
      set.add(html);
    }
    expect(set.size).toBe(4);
  });

  it("includes copy button in header", () => {
    const header = { id: "h1", type: "bash" as const, status: "success" as const, timestamp: 1, title: "Test", isExpanded: true, isCollapsible: true };
    const html = renderCardHeader(header);
    expect(html).toContain("copy");
  });
});
