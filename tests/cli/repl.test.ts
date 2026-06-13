import { describe, expect, it, vi, beforeEach } from "vitest";
import { dispatchEvent } from "../../src/cli/renderer";
import { renderSummary } from "../../src/cli/summary";
import { renderTodoPanel } from "../../src/cli/todo-panel";
import { isCommand, parseCommand, HELP_TEXT } from "../../src/cli/input";
import type { TerminalConfig } from "../../src/cli/types";
import type { TurnEvent, TurnSummary } from "../../src/runtime/types";

const tty: TerminalConfig = {
  width: 100,
  supportsColor: true,
  isTTY: true,
};

describe("REPL Integration", () => {
  let stdout = "";
  let stderr = "";

  beforeEach(() => {
    stdout = "";
    stderr = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout +=
        typeof chunk === "string"
          ? chunk
          : new TextDecoder().decode(chunk as Uint8Array);
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr +=
        typeof chunk === "string"
          ? chunk
          : new TextDecoder().decode(chunk as Uint8Array);
      return true;
    });
  });

  describe("dispatchEvent", () => {
    it("renders text event content", () => {
      const event: TurnEvent = { type: "text", content: "Hello world" };
      dispatchEvent(event, tty);
      expect(stdout).toContain("Hello world");
    });

    it("renders tool_call event as dim text", () => {
      const event: TurnEvent = {
        type: "tool_call",
        name: "Read",
        args: { file_path: "src/index.ts" },
      };
      dispatchEvent(event, tty);
      expect(stdout).toContain("[Read]");
      expect(stdout).toContain("src/index.ts");
    });

    it("renders successful tool_result with checkmark", () => {
      const event: TurnEvent = {
        type: "tool_result",
        name: "Read",
        success: true,
        summary: "50 lines",
      };
      dispatchEvent(event, tty);
      expect(stdout).toContain("[Read]");
      expect(stdout).toContain("50 lines");
    });

    it("renders failed tool_result with X mark", () => {
      const event: TurnEvent = {
        type: "tool_result",
        name: "Read",
        success: false,
        summary: "File not found",
      };
      dispatchEvent(event, tty);
      expect(stdout).toContain("File not found");
    });

    it("renders turn_end summary stats", () => {
      const summary: TurnSummary = {
        turnNumber: 3,
        totalTokens: 1500,
        totalCost: 0.003,
        reason: "completed",
      };
      const event: TurnEvent = { type: "turn_end", summary };
      dispatchEvent(event, tty);
      expect(stdout).toContain("Turn 3");
      expect(stdout).toContain("1500 tokens");
    });

    it("renders error events to stderr", () => {
      const event: TurnEvent = {
        type: "error",
        message: "Connection failed",
      };
      dispatchEvent(event, tty);
      expect(stderr).toContain("Connection failed");
    });
  });

  describe("renderSummary", () => {
    it("shows turn number and tokens", () => {
      const summary: TurnSummary = {
        turnNumber: 1,
        totalTokens: 500,
        totalCost: 0.001,
        reason: "completed",
      };
      renderSummary(summary);
      expect(stdout).toContain("Turn 1");
      expect(stdout).toContain("500 tokens");
    });

    it("shows reason for non-completed turns", () => {
      const summary: TurnSummary = {
        turnNumber: 2,
        totalTokens: 100,
        totalCost: 0,
        reason: "interrupted",
      };
      renderSummary(summary);
      expect(stdout).toContain("interrupted");
    });
  });

  describe("renderTodoPanel", () => {
    it("renders task list with status icons", () => {
      renderTodoPanel(
        [
          { subject: "Read project", status: "completed" },
          { subject: "Fix bug", status: "in_progress" },
          { subject: "Add tests", status: "pending" },
        ],
        tty,
      );
      expect(stdout).toContain("Tasks");
      expect(stdout).toContain("Read project");
      expect(stdout).toContain("Fix bug");
      expect(stdout).toContain("Add tests");
    });

    it("renders nothing for empty task list", () => {
      renderTodoPanel([], tty);
      expect(stdout).toBe("");
    });
  });

  describe("command parsing", () => {
    it("detects /commands", () => {
      expect(isCommand("/help")).toBe(true);
      expect(isCommand("/exit")).toBe(true);
      expect(isCommand("hello")).toBe(false);
      expect(isCommand("")).toBe(false);
    });

    it("parses /command with args", () => {
      const result = parseCommand("/plan verbose");
      expect(result.command).toBe("/plan");
      expect(result.args).toBe("verbose");
    });

    it("parses /command without args", () => {
      const result = parseCommand("/help");
      expect(result.command).toBe("/help");
      expect(result.args).toBe("");
    });

    it("has help text", () => {
      expect(HELP_TEXT).toContain("/help");
      expect(HELP_TEXT).toContain("/exit");
    });
  });
});
