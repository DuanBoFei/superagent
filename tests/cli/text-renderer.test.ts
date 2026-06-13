import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderText } from "../../src/cli/text-renderer";
import type { TerminalConfig } from "../../src/cli/types";

const tty: TerminalConfig = {
  width: 80,
  supportsColor: true,
  isTTY: true,
};

describe("Text Renderer", () => {
  let stdout = "";

  beforeEach(() => {
    stdout = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout +=
        typeof chunk === "string"
          ? chunk
          : new TextDecoder().decode(chunk as Uint8Array);
      return true;
    });
  });

  it("writes simple text word-by-word", () => {
    renderText("hello world", tty);
    expect(stdout).toContain("hello");
    expect(stdout).toContain("world");
  });

  it("writes single word", () => {
    renderText("hello", tty);
    expect(stdout).toBe("hello");
  });

  it("handles newlines by resetting column", () => {
    renderText("line1\nline2", tty);
    expect(stdout).toContain("line1");
    expect(stdout).toContain("line2");
  });

  it("handles empty string", () => {
    renderText("", tty);
    expect(stdout).toBe("");
  });

  it("wraps long lines at terminal width", () => {
    const long = "a".repeat(100);
    renderText(long, { ...tty, width: 40 });
    // Should contain a newline wrap (with indent)
    expect(stdout).toContain("\n");
  });

  it("respects narrow terminal width", () => {
    const text = "this is a long sentence that should wrap";
    renderText(text, { ...tty, width: 15 });
    // It should still output all words
    expect(stdout).toContain("this");
    expect(stdout).toContain("wrap");
  });
});
