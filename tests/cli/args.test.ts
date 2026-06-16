import { describe, expect, it } from "vitest";
import { parseCliMode } from "../../src/cli/args";

describe("parseCliMode", () => {
  it("returns one-shot mode when --prompt is present with text", () => {
    const result = parseCliMode(["node", "index.js", "--prompt", "hello world"]);
    expect(result).toEqual({ mode: "one-shot", prompt: "hello world" });
  });

  it("returns one-shot mode when --prompt is the only arg", () => {
    const result = parseCliMode(["node", "index.js", "--prompt", "fix the bug"]);
    expect(result).toEqual({ mode: "one-shot", prompt: "fix the bug" });
  });

  it("returns error mode when --prompt has empty or missing value", () => {
    const result = parseCliMode(["node", "index.js", "--prompt"]);
    expect(result).toEqual({
      mode: "error",
      message: "Fatal: --prompt requires a message",
    });
  });

  it("returns error mode when --prompt has only whitespace value", () => {
    const result = parseCliMode(["node", "index.js", "--prompt", "   "]);
    expect(result).toEqual({
      mode: "error",
      message: "Fatal: --prompt requires a message",
    });
  });

  it("returns interactive mode when no --prompt flag is present", () => {
    const result = parseCliMode(["node", "index.js"]);
    expect(result).toEqual({ mode: "interactive" });
  });

  it("returns interactive mode with --resume flag", () => {
    const result = parseCliMode(["node", "index.js", "--resume", "some-id"]);
    expect(result).toEqual({ mode: "interactive" });
  });

  it("returns interactive mode with --list flag", () => {
    const result = parseCliMode(["node", "index.js", "--list"]);
    expect(result).toEqual({ mode: "interactive" });
  });
});
