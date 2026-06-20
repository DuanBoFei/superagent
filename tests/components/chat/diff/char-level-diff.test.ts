import { describe, expect, it } from "vitest";
import { computeCharChanges } from "../../../../packages/web/src/lib/char-level-diff";

describe("computeCharChanges", () => {
  it("returns empty array for identical strings", () => {
    const changes = computeCharChanges("hello", "hello");
    expect(changes).toEqual([]);
  });

  it("returns empty array for both empty strings", () => {
    const changes = computeCharChanges("", "");
    expect(changes).toEqual([]);
  });

  it("detects single character addition", () => {
    const changes = computeCharChanges("hello", "hellox");
    expect(changes.length).toBe(1);
    expect(changes[0]!.type).toBe("add");
    expect(changes[0]!.start).toBe(5);
    expect(changes[0]!.end).toBe(6);
  });

  it("detects single character deletion", () => {
    const changes = computeCharChanges("hellox", "hello");
    expect(changes.length).toBe(1);
    expect(changes[0]!.type).toBe("delete");
    expect(changes[0]!.start).toBe(5);
    expect(changes[0]!.end).toBe(6);
  });

  it("detects character replacement", () => {
    const changes = computeCharChanges("const x = 1;", "const y = 1;");
    expect(changes.length).toBe(2);
    expect(changes.some((c) => c.type === "delete")).toBe(true);
    expect(changes.some((c) => c.type === "add")).toBe(true);
  });

  it("handles empty old text (pure addition)", () => {
    const changes = computeCharChanges("", "new content");
    expect(changes.length).toBe(1);
    expect(changes[0]!.type).toBe("add");
    expect(changes[0]!.start).toBe(0);
    expect(changes[0]!.end).toBe(11);
  });

  it("handles empty new text (pure deletion)", () => {
    const changes = computeCharChanges("old content", "");
    expect(changes.length).toBe(1);
    expect(changes[0]!.type).toBe("delete");
    expect(changes[0]!.start).toBe(0);
    expect(changes[0]!.end).toBe(11);
  });

  it("detects change in the middle of a string", () => {
    const changes = computeCharChanges(
      "import { foo, bar } from './mod';",
      "import { foo, baz } from './mod';",
    );
    expect(changes.length).toBe(2);
  });

  it("handles multi-character insertion at start", () => {
    const changes = computeCharChanges("world", "hello world");
    expect(changes.some((c) => c.type === "add")).toBe(true);
  });

  it("handles long identical prefixes and suffixes", () => {
    const changes = computeCharChanges(
      "aaaaaaaaaaXbbbbbbbbbb",
      "aaaaaaaaaaYbbbbbbbbbb",
    );
    expect(changes.length).toBe(2);
    expect(changes.some((c) => c.type === "delete")).toBe(true);
    expect(changes.some((c) => c.type === "add")).toBe(true);
  });

  it("performs well with 1000 character string", () => {
    const oldText = "x".repeat(500) + "CHANGE_HERE" + "y".repeat(488);
    const newText = "x".repeat(500) + "MODIFIED!" + "y".repeat(488);

    const start = performance.now();
    const changes = computeCharChanges(oldText, newText);
    const elapsed = performance.now() - start;

    expect(changes.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5);
  });
});
