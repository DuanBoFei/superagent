import { describe, expect, it } from "vitest";
import { renderBashCard } from "../../packages/web/src/components/chat/cards/BashCard";
import type { BashCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<BashCard> = {}): BashCard {
  return {
    id: "b1",
    type: "bash",
    status: "success",
    timestamp: 1_720_000_000_000,
    title: "npm test",
    isExpanded: true,
    isCollapsible: true,
    content: {
      command: "npm",
      args: ["test"],
      output: "> test passed\n",
      exitCode: 0,
      durationMs: 1200,
    },
    ...overrides,
  } as BashCard;
}

describe("renderBashCard", () => {
  it("renders the command and args", () => {
    const html = renderBashCard(card({ content: { command: "git", args: ["status", "--short"], output: "M file.txt\n", exitCode: 0, durationMs: 100 } }));
    expect(html).toContain("git");
    expect(html).toContain("status");
    expect(html).toContain("--short");
  });

  it("renders ANSI-colored output via the parser", () => {
    const html = renderBashCard(card({ content: { command: "echo", args: [], output: "\x1b[31merror\x1b[0m", exitCode: 0, durationMs: 50 } }));
    // Red ANSI code should be converted to color style
    expect(html).toContain("color:#ff5555");
    expect(html).toContain("error");
  });

  it("shows exit code 0 as success", () => {
    const html = renderBashCard(card({ content: { command: "ls", args: [], output: "", exitCode: 0, durationMs: 10 } }));
    expect(html).toContain("exit-0");
    expect(html).toContain("0");
  });

  it("shows non-zero exit code as error", () => {
    const html = renderBashCard(card({ content: { command: "ls", args: [], output: "No such file", exitCode: 2, durationMs: 15 } }));
    expect(html).toContain("Exit: 2");
  });

  it("shows exit code as pending when null", () => {
    const html = renderBashCard(card({ content: { command: "npm", args: ["install"], output: "installing...", exitCode: null, durationMs: null } }));
    expect(html).toContain("exit-pending");
  });

  it("displays duration when available", () => {
    const html = renderBashCard(card({ content: { command: "npm", args: [], output: "", exitCode: 0, durationMs: 2500 } }));
    expect(html).toContain("2.5");
  });

  it("shows duration as pending when null", () => {
    const html = renderBashCard(card({ content: { command: "npm", args: [], output: "", exitCode: null, durationMs: null } }));
    expect(html).toContain("duration-pending");
  });

  it("escapes HTML in command output", () => {
    const html = renderBashCard(card({ content: { command: "cat", args: [], output: "<script>alert(1)</script>", exitCode: 0, durationMs: 5 } }));
    expect(html).not.toContain("<script>");
  });

  it("marks long output (>50 lines) as collapsible", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n");
    const html = renderBashCard(card({ content: { command: "cat", args: ["big.txt"], output: lines, exitCode: 0, durationMs: 100 } }));
    expect(html).toContain("bash-collapsible");
    // First 10 lines are visible (collapsed at 10)
    expect(html).toContain("line 0");
    expect(html).toContain("line 9");
    // "Show all" button appears with total line count
    expect(html).toContain("Show all 60 lines");
  });

  it("shows full output for short output (<=50 lines)", () => {
    const lines = Array.from({ length: 5 }, (_, i) => `line ${i}`).join("\n");
    const html = renderBashCard(card({ content: { command: "cat", args: [], output: lines, exitCode: 0, durationMs: 10 } }));
    // Should contain all lines
    for (let i = 0; i < 5; i++) {
      expect(html).toContain(`line ${i}`);
    }
  });
});
