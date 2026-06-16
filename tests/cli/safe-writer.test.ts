import { describe, expect, it } from "vitest";
import { createSafeWriter } from "../../src/cli/safe-writer";
import type { TerminalProfile } from "../../src/cli/terminal-profile";

function captureWrite() {
  const lines: string[] = [];
  const write = (s: string) => {
    lines.push(s);
    return true;
  };
  return { write, lines };
}

describe("createSafeWriter · default profile", () => {
  it("writes text directly to stdout", () => {
    const { write, lines } = captureWrite();
    const w = createSafeWriter("default", write);

    w.writeln("Hello world");

    expect(lines.join("")).toContain("Hello world");
  });

  it("does not inject escape sequences for line clearing", () => {
    const { write, lines } = captureWrite();
    const w = createSafeWriter("default", write);

    w.writeln("text");

    const output = lines.join("");
    expect(output).not.toContain("\x1b[K");
    expect(output).not.toContain("\r");
  });

  it("writes multiple lines sequentially without redundant resets", () => {
    const { write, lines } = captureWrite();
    const w = createSafeWriter("default", write);

    w.writeln("line1");
    w.writeln("line2");
    w.writeln("line3");

    const output = lines.join("");
    expect(output).toContain("line1");
    expect(output).toContain("line2");
    expect(output).toContain("line3");
  });
});

describe("createSafeWriter · Windows profile", () => {
  const windowsProfiles: TerminalProfile[] = [
    "windows-powershell",
    "windows-vscode",
  ];

  for (const profile of windowsProfiles) {
    it(`clears current line before write on ${profile}`, () => {
      const { write, lines } = captureWrite();
      const w = createSafeWriter(profile, write);

      w.writeln("text");

      const output = lines.join("");
      expect(output).toContain("\r\x1b[K");
    });

    it(`ends output with newline on ${profile}`, () => {
      const { write, lines } = captureWrite();
      const w = createSafeWriter(profile, write);

      w.writeln("text");

      const output = lines.join("");
      expect(output).toContain("text\n");
    });
  }
});

describe("createSafeWriter · write (no newline)", () => {
  it("writes without trailing newline", () => {
    const { write, lines } = captureWrite();
    const w = createSafeWriter("default", write);

    w.write("partial");

    const output = lines.join("");
    expect(output).toBe("partial");
  });
});
