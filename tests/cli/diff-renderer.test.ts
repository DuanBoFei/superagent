import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderDiff } from "../../src/cli/diff-renderer";

describe("Diff Renderer", () => {
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

  it("shows file path header", () => {
    renderDiff("old", "new", "src/test.ts");
    expect(stdout).toContain("--- src/test.ts");
    expect(stdout).toContain("+++ src/test.ts");
  });

  it("shows added lines with + prefix", () => {
    renderDiff("", "added line", "file.ts");
    expect(stdout).toContain("+");
  });

  it("shows removed lines with - prefix", () => {
    renderDiff("removed line", "", "file.ts");
    expect(stdout).toContain("-");
  });

  it("shows context lines unchanged", () => {
    renderDiff("same line", "same line", "file.ts");
    // Context lines are present without + or - prefix
    const lines = stdout.split("\n").filter((l) => l.includes("same line"));
    expect(lines.length).toBeGreaterThan(0);
  });

  it("handles identical content", () => {
    renderDiff("line1\nline2", "line1\nline2", "file.ts");
    // Should not have added/removed markers, only context
    expect(stdout).not.toContain("+ line1");
    expect(stdout).not.toContain("- line1");
  });

  it("sanitizes non-printable characters", () => {
    const bad = "test\x00bad\x1fchars";
    renderDiff(bad, bad, "file.ts");
    expect(stdout).not.toContain("\x00");
    expect(stdout).not.toContain("\x1f");
  });
});
