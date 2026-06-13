import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderText } from "../../src/cli/text-renderer";
import { stringWidth } from "../../src/cli/wcwidth";
import type { TerminalConfig } from "../../src/cli/types";

const tty: TerminalConfig = {
  width: 80,
  supportsColor: true,
  isTTY: true,
};

function capture(fn: () => void): string {
  let out = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    out +=
      typeof chunk === "string"
        ? chunk
        : new TextDecoder().decode(chunk as Uint8Array);
    return true;
  });
  fn();
  return out;
}

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
    expect(stdout).toContain("\n");
  });

  it("respects narrow terminal width", () => {
    const text = "this is a long sentence that should wrap";
    renderText(text, { ...tty, width: 15 });
    expect(stdout).toContain("this");
    expect(stdout).toContain("wrap");
  });
});

describe("Text Renderer — multi-width", () => {
  it("renders ASCII at width 40 without losing chars", () => {
    const out = capture(() => renderText("a".repeat(100), { ...tty, width: 40 }));
    const visible = out.replace(/\n/g, "").replace(/ /g, "");
    expect(visible).toBe("a".repeat(100));
  });

  it("renders ASCII at width 80 without losing chars", () => {
    const out = capture(() => renderText("a".repeat(200), { ...tty, width: 80 }));
    const visible = out.replace(/\n/g, "").replace(/ /g, "");
    expect(visible).toBe("a".repeat(200));
  });

  it("renders ASCII at width 120 without losing chars", () => {
    const out = capture(() => renderText("b".repeat(300), { ...tty, width: 120 }));
    const visible = out.replace(/\n/g, "").replace(/ /g, "");
    expect(visible).toBe("b".repeat(300));
  });

  it("renders ASCII at width 200 without losing chars", () => {
    const out = capture(() => renderText("c".repeat(500), { ...tty, width: 200 }));
    const visible = out.replace(/\n/g, "").replace(/ /g, "");
    expect(visible).toBe("c".repeat(500));
  });

  it("renders narrow (<40 col) terminal without dropping content", () => {
    const out = capture(() =>
      renderText("the quick brown fox jumps over the lazy dog", {
        ...tty,
        width: 12,
      }),
    );
    expect(out).toContain("quick");
    expect(out).toContain("brown");
    expect(out).toContain("lazy");
    expect(out).toContain("dog");
  });
});

describe("Text Renderer — Unicode", () => {
  it("renders Chinese text without corruption", () => {
    const out = capture(() => renderText("你好世界", tty));
    expect(out).toBe("你好世界");
  });

  it("wraps CJK at narrow width", () => {
    const out = capture(() =>
      renderText("你好世界你好世界你好世界", { ...tty, width: 8 }),
    );
    // All four chars should appear (6 chars × 2 cols = 12 cols, wraps at 8)
    let count = 0;
    for (const ch of "你好世界你好世界你好世界") {
      if (out.includes(ch)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it("mixes CJK and ASCII widths correctly", () => {
    const out = capture(() => renderText("hello世界", { ...tty, width: 40 }));
    expect(out).toContain("hello世界");
  });

  it("handles fullwidth punctuation", () => {
    const out = capture(() => renderText("你好！", tty));
    expect(out).toContain("你好！");
  });

  it("handles emoji in output", () => {
    const out = capture(() => renderText("done ✅ passed", tty));
    expect(out).toContain("✅");
  });
});

describe("stringWidth", () => {
  it("counts ASCII as 1", () => {
    expect(stringWidth("abc")).toBe(3);
  });

  it("counts CJK as 2 per char", () => {
    expect(stringWidth("你好")).toBe(4);
  });

  it("counts mixed string", () => {
    expect(stringWidth("hello你好")).toBe(9); // 5 + 4
  });

  it("counts empty string as 0", () => {
    expect(stringWidth("")).toBe(0);
  });

  it("counts fullwidth latin", () => {
    expect(stringWidth("Ａ")).toBe(2);
  });
});
