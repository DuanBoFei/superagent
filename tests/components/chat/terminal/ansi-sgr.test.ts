import { describe, expect, it } from "vitest";
import {
  applySgrCodes,
  attributesEqual,
  attributesToCssInline,
  createDefaultAttributes,
  hasAttributes,
} from "../../../../packages/web/src/lib/ansi-parser/sgr";
import type { TerminalAttributes } from "../../../../packages/web/src/types/terminal";

describe("ansi SGR processor", () => {
  describe("createDefaultAttributes", () => {
    it("returns all-false attributes with null colors", () => {
      const attrs = createDefaultAttributes();
      expect(attrs.bold).toBe(false);
      expect(attrs.foreground).toBeNull();
      expect(attrs.background).toBeNull();
      expect(attrs.hidden).toBe(false);
    });
  });

  describe("applySgrCodes — reset", () => {
    it("code 0 resets all attributes", () => {
      const current: TerminalAttributes = {
        ...createDefaultAttributes(),
        bold: true,
        foreground: { r: 255, g: 0, b: 0 },
      };
      const result = applySgrCodes(current, [0]);
      expect(result.bold).toBe(false);
      expect(result.foreground).toBeNull();
    });
  });

  describe("applySgrCodes — format codes", () => {
    it("code 1 sets bold", () => {
      const result = applySgrCodes(createDefaultAttributes(), [1]);
      expect(result.bold).toBe(true);
    });

    it("code 2 sets dim", () => {
      const result = applySgrCodes(createDefaultAttributes(), [2]);
      expect(result.dim).toBe(true);
    });

    it("code 3 sets italic", () => {
      const result = applySgrCodes(createDefaultAttributes(), [3]);
      expect(result.italic).toBe(true);
    });

    it("code 4 sets underline", () => {
      const result = applySgrCodes(createDefaultAttributes(), [4]);
      expect(result.underline).toBe(true);
    });

    it("code 5 sets blink", () => {
      const result = applySgrCodes(createDefaultAttributes(), [5]);
      expect(result.blink).toBe(true);
    });

    it("code 7 sets inverse", () => {
      const result = applySgrCodes(createDefaultAttributes(), [7]);
      expect(result.inverse).toBe(true);
    });

    it("code 8 sets hidden", () => {
      const result = applySgrCodes(createDefaultAttributes(), [8]);
      expect(result.hidden).toBe(true);
    });

    it("code 9 sets strikethrough", () => {
      const result = applySgrCodes(createDefaultAttributes(), [9]);
      expect(result.strikethrough).toBe(true);
    });
  });

  describe("applySgrCodes — cancel codes", () => {
    it("code 22 cancels bold and dim", () => {
      const current = { ...createDefaultAttributes(), bold: true, dim: true };
      const result = applySgrCodes(current, [22]);
      expect(result.bold).toBe(false);
      expect(result.dim).toBe(false);
    });

    it("code 23 cancels italic", () => {
      const current = { ...createDefaultAttributes(), italic: true };
      const result = applySgrCodes(current, [23]);
      expect(result.italic).toBe(false);
    });

    it("code 24 cancels underline", () => {
      const current = { ...createDefaultAttributes(), underline: true };
      const result = applySgrCodes(current, [24]);
      expect(result.underline).toBe(false);
    });

    it("code 25 cancels blink", () => {
      const current = { ...createDefaultAttributes(), blink: true };
      const result = applySgrCodes(current, [25]);
      expect(result.blink).toBe(false);
    });

    it("code 27 cancels inverse", () => {
      const current = { ...createDefaultAttributes(), inverse: true };
      const result = applySgrCodes(current, [27]);
      expect(result.inverse).toBe(false);
    });

    it("code 28 cancels hidden", () => {
      const current = { ...createDefaultAttributes(), hidden: true };
      const result = applySgrCodes(current, [28]);
      expect(result.hidden).toBe(false);
    });

    it("code 29 cancels strikethrough", () => {
      const current = { ...createDefaultAttributes(), strikethrough: true };
      const result = applySgrCodes(current, [29]);
      expect(result.strikethrough).toBe(false);
    });
  });

  describe("applySgrCodes — foreground 16-color", () => {
    it("code 30 sets foreground to standard black", () => {
      const result = applySgrCodes(createDefaultAttributes(), [30]);
      expect(result.foreground).not.toBeNull();
      // Dark-optimized black index 0
      expect(result.foreground!.r).toBeGreaterThan(20);
    });

    it("code 31 sets foreground to standard red", () => {
      const result = applySgrCodes(createDefaultAttributes(), [31]);
      expect(result.foreground!.r).toBeGreaterThan(200);
      expect(result.foreground!.g).toBeLessThan(100);
    });

    it("code 32 sets foreground to standard green", () => {
      const result = applySgrCodes(createDefaultAttributes(), [32]);
      expect(result.foreground!.g).toBeGreaterThan(150);
    });

    it("code 37 sets foreground to standard white", () => {
      const result = applySgrCodes(createDefaultAttributes(), [37]);
      expect(result.foreground!.r).toBeGreaterThan(200);
      expect(result.foreground!.g).toBeGreaterThan(200);
      expect(result.foreground!.b).toBeGreaterThan(200);
    });

    it("code 39 resets foreground to default", () => {
      const current = { ...createDefaultAttributes(), foreground: { r: 255, g: 0, b: 0 } as const };
      expect(current.foreground).not.toBeNull();
      const result = applySgrCodes(current, [39]);
      expect(result.foreground).toBeNull();
    });
  });

  describe("applySgrCodes — background 16-color", () => {
    it("code 40 sets background to black", () => {
      const result = applySgrCodes(createDefaultAttributes(), [40]);
      expect(result.background).not.toBeNull();
    });

    it("code 49 resets background to default", () => {
      const current = { ...createDefaultAttributes(), background: { r: 0, g: 0, b: 0 } as const };
      const result = applySgrCodes(current, [49]);
      expect(result.background).toBeNull();
    });
  });

  describe("applySgrCodes — bright foreground", () => {
    it("code 90 sets foreground to bright black", () => {
      const result = applySgrCodes(createDefaultAttributes(), [90]);
      expect(result.foreground).not.toBeNull();
      // Bright black should be gray-ish
      expect(result.foreground!.r).toBeGreaterThan(80);
    });

    it("code 97 sets foreground to bright white", () => {
      const result = applySgrCodes(createDefaultAttributes(), [97]);
      expect(result.foreground!.r).toBe(255);
      expect(result.foreground!.g).toBe(255);
      expect(result.foreground!.b).toBe(255);
    });
  });

  describe("applySgrCodes — bright background", () => {
    it("code 100 sets background to bright black", () => {
      const result = applySgrCodes(createDefaultAttributes(), [100]);
      expect(result.background).not.toBeNull();
    });

    it("code 107 sets background to bright white", () => {
      const result = applySgrCodes(createDefaultAttributes(), [107]);
      expect(result.background!.r).toBe(255);
      expect(result.background!.g).toBe(255);
      expect(result.background!.b).toBe(255);
    });
  });

  describe("applySgrCodes — extended colors (38/48)", () => {
    it("code 38;5;196 sets foreground to 256-color", () => {
      const result = applySgrCodes(createDefaultAttributes(), [38, 5, 196]);
      expect(result.foreground).not.toBeNull();
      // 196 is a red in the 6×6×6 cube
      expect(result.foreground!.r).toBe(255);
      expect(result.foreground!.g).toBe(0);
      expect(result.foreground!.b).toBe(0);
    });

    it("code 48;5;46 sets background to 256-color green", () => {
      const result = applySgrCodes(createDefaultAttributes(), [48, 5, 46]);
      expect(result.background).not.toBeNull();
    });

    it("code 38;2;100;200;50 sets foreground to TrueColor", () => {
      const result = applySgrCodes(createDefaultAttributes(), [38, 2, 100, 200, 50]);
      expect(result.foreground).toEqual({ r: 100, g: 200, b: 50 });
    });

    it("code 48;2;50;100;200 sets background to TrueColor", () => {
      const result = applySgrCodes(createDefaultAttributes(), [48, 2, 50, 100, 200]);
      expect(result.background).toEqual({ r: 50, g: 100, b: 200 });
    });

    it("ignores incomplete extended color sequence gracefully", () => {
      // 38 with no following codes
      const result = applySgrCodes(createDefaultAttributes(), [38]);
      expect(result.foreground).toBeNull();
    });
  });

  describe("applySgrCodes — attribute accumulation", () => {
    it("merges multiple codes incrementally", () => {
      let attrs = createDefaultAttributes();
      attrs = applySgrCodes(attrs, [1]);       // bold
      attrs = applySgrCodes(attrs, [31]);      // red fg
      attrs = applySgrCodes(attrs, [4]);       // underline
      expect(attrs.bold).toBe(true);
      expect(attrs.foreground).not.toBeNull();
      expect(attrs.underline).toBe(true);
      // Other attributes unchanged
      expect(attrs.dim).toBe(false);
      expect(attrs.italic).toBe(false);
    });

    it("bold+fg+underline combination all active", () => {
      const result = applySgrCodes(createDefaultAttributes(), [1, 32, 4]);
      expect(result.bold).toBe(true);
      expect(result.foreground).not.toBeNull();
      expect(result.underline).toBe(true);
    });

    it("reset clears accumulated attributes", () => {
      let attrs = createDefaultAttributes();
      attrs = applySgrCodes(attrs, [1, 31, 4]);
      attrs = applySgrCodes(attrs, [0]);
      expect(attrs.bold).toBe(false);
      expect(attrs.foreground).toBeNull();
      expect(attrs.underline).toBe(false);
    });
  });

  describe("applySgrCodes — unknown codes ignored", () => {
    it("does not crash on unknown codes", () => {
      const result = applySgrCodes(createDefaultAttributes(), [999, 1000, -1]);
      expect(result).toBeDefined();
      expect(attributesEqual(result, createDefaultAttributes())).toBe(true);
    });
  });

  describe("attributesToCssInline", () => {
    it("returns empty string for default attributes", () => {
      expect(attributesToCssInline(createDefaultAttributes())).toBe("");
    });

    it("renders bold as font-weight:700", () => {
      const attrs = { ...createDefaultAttributes(), bold: true };
      expect(attributesToCssInline(attrs)).toContain("font-weight:700");
    });

    it("renders foreground color", () => {
      const attrs = { ...createDefaultAttributes(), foreground: { r: 78, g: 222, b: 163 } };
      expect(attributesToCssInline(attrs)).toContain("color:#4edea3");
    });

    it("renders background color", () => {
      const attrs = { ...createDefaultAttributes(), background: { r: 30, g: 30, b: 30 } };
      expect(attributesToCssInline(attrs)).toContain("background-color:#1e1e1e");
    });

    it("renders italic as font-style:italic", () => {
      const attrs = { ...createDefaultAttributes(), italic: true };
      expect(attributesToCssInline(attrs)).toContain("font-style:italic");
    });

    it("renders dim as opacity:0.7", () => {
      const attrs = { ...createDefaultAttributes(), dim: true };
      expect(attributesToCssInline(attrs)).toContain("opacity:0.7");
    });

    it("renders underline", () => {
      const attrs = { ...createDefaultAttributes(), underline: true };
      expect(attributesToCssInline(attrs)).toContain("text-decoration:underline");
    });

    it("renders strikethrough", () => {
      const attrs = { ...createDefaultAttributes(), strikethrough: true };
      expect(attributesToCssInline(attrs)).toContain("text-decoration:line-through");
    });

    it("renders both underline and strikethrough together", () => {
      const attrs = { ...createDefaultAttributes(), underline: true, strikethrough: true };
      const css = attributesToCssInline(attrs);
      expect(css).toContain("text-decoration:underline line-through");
    });

    it("renders hidden as visibility:hidden", () => {
      const attrs = { ...createDefaultAttributes(), hidden: true };
      expect(attributesToCssInline(attrs)).toContain("visibility:hidden");
    });

    it("swaps fg/bg when inverse is true", () => {
      const attrs: TerminalAttributes = {
        ...createDefaultAttributes(),
        foreground: { r: 255, g: 0, b: 0 },
        background: { r: 0, g: 0, b: 255 },
        inverse: true,
      };
      const css = attributesToCssInline(attrs);
      // inverse swaps: background-color should be the original fg color
      expect(css).toContain("color:#0000ff");
      expect(css).toContain("background-color:#ff0000");
    });
  });

  describe("hasAttributes", () => {
    it("returns false for default attributes", () => {
      expect(hasAttributes(createDefaultAttributes())).toBe(false);
    });

    it("returns true when bold is set", () => {
      expect(hasAttributes({ ...createDefaultAttributes(), bold: true })).toBe(true);
    });

    it("returns true when foreground is set", () => {
      expect(hasAttributes({ ...createDefaultAttributes(), foreground: { r: 255, g: 0, b: 0 } })).toBe(true);
    });

    it("returns false for only blink (not rendered in CSS)", () => {
      // Blink is handled by animation, not inline CSS
      expect(hasAttributes({ ...createDefaultAttributes(), blink: true })).toBe(false);
    });
  });

  describe("attributesEqual", () => {
    it("returns true for identical attributes", () => {
      expect(attributesEqual(createDefaultAttributes(), createDefaultAttributes())).toBe(true);
    });

    it("returns false when bold differs", () => {
      const a = createDefaultAttributes();
      const b = { ...a, bold: true };
      expect(attributesEqual(a, b)).toBe(false);
    });

    it("returns false when foreground differs", () => {
      const a = { ...createDefaultAttributes(), foreground: { r: 255, g: 0, b: 0 } };
      const b = { ...createDefaultAttributes(), foreground: { r: 0, g: 255, b: 0 } };
      expect(attributesEqual(a, b)).toBe(false);
    });

    it("returns false when one has null fg and other doesn't", () => {
      const a = createDefaultAttributes();
      const b = { ...a, foreground: { r: 255, g: 0, b: 0 } };
      expect(attributesEqual(a, b)).toBe(false);
    });
  });
});
