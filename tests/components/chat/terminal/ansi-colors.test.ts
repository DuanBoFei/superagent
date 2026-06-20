import { describe, expect, it } from "vitest";
import {
  ansi16Color,
  colorToHex,
  contrastRatio,
  parseExtendedColor,
  relativeLuminance,
  trueColor,
  xterm256Color,
} from "../../../../packages/web/src/lib/ansi-parser/colors";
import type { RgbColor } from "../../../../packages/web/src/types/terminal";

describe("ansi color mapping", () => {
  describe("ansi16Color (dark theme)", () => {
    it("returns dark-optimized black (index 0) that is distinguishable from #1e1e1e", () => {
      const black = ansi16Color(0);
      // Dark-optimized black should be lighter than #121212
      expect(black.r).toBeGreaterThan(20);
      expect(black.g).toBeGreaterThan(20);
      expect(black.b).toBeGreaterThan(20);
    });

    it("returns standard red (index 1)", () => {
      const red = ansi16Color(1);
      expect(red.r).toBeGreaterThan(200);
      expect(red.g).toBeLessThan(100);
      expect(red.b).toBeLessThan(100);
    });

    it("returns standard green (index 2)", () => {
      const green = ansi16Color(2);
      expect(green.r).toBeLessThan(120);
      expect(green.g).toBeGreaterThan(150);
      expect(green.b).toBeLessThan(100);
    });

    it("returns white (index 7)", () => {
      const white = ansi16Color(7);
      expect(white.r).toBeGreaterThan(200);
      expect(white.g).toBeGreaterThan(200);
      expect(white.b).toBeGreaterThan(200);
    });

    it("returns bright white (index 15)", () => {
      const bright = ansi16Color(15);
      expect(bright.r).toBe(255);
      expect(bright.g).toBe(255);
      expect(bright.b).toBe(255);
    });

    it("clamps index to 0-15 range", () => {
      const neg = ansi16Color(-1);
      const overflow = ansi16Color(99);
      // Negative clamped to 0
      expect(neg).toEqual(ansi16Color(0));
      // Overflow clamped to 15
      expect(overflow).toEqual(ansi16Color(15));
    });
  });

  describe("xterm256Color", () => {
    it("delegates to ansi16 for indices 0-15", () => {
      expect(xterm256Color(1)).toEqual(ansi16Color(1));
      expect(xterm256Color(9)).toEqual(ansi16Color(9));
    });

    it("computes correct 6×6×6 cube color for index 16 (first cube cell)", () => {
      const color = xterm256Color(16);
      expect(color).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("computes correct 6×6×6 cube color for index 46", () => {
      // idx=46 => idx-16=30 => r=Math.floor(30/36)=0, g=Math.floor(30/6)%6=5, b=30%6=0
      // r=0, g=5*51=255, b=0
      const color = xterm256Color(46);
      expect(color.r).toBe(0);
      expect(color.g).toBe(255);
      expect(color.b).toBe(0);
    });

    it("computes correct 6×6×6 cube color for index 231 (last cube cell)", () => {
      const color = xterm256Color(231);
      expect(color).toEqual({ r: 255, g: 255, b: 255 });
    });

    it("computes correct grayscale for index 232 (first gray)", () => {
      const color = xterm256Color(232);
      // (232-232)/23 * 255 = 0
      expect(color.r).toBe(0);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    });

    it("computes correct grayscale for index 255 (last gray)", () => {
      const color = xterm256Color(255);
      expect(color.r).toBe(255);
      expect(color.g).toBe(255);
      expect(color.b).toBe(255);
    });

    it("handles all 256 color indices without throwing", () => {
      for (let i = 0; i < 256; i++) {
        const c = xterm256Color(i);
        expect(c.r).toBeGreaterThanOrEqual(0);
        expect(c.r).toBeLessThanOrEqual(255);
        expect(c.g).toBeGreaterThanOrEqual(0);
        expect(c.g).toBeLessThanOrEqual(255);
        expect(c.b).toBeGreaterThanOrEqual(0);
        expect(c.b).toBeLessThanOrEqual(255);
      }
    });
  });

  describe("trueColor", () => {
    it("constructs valid RGB within 0-255 range", () => {
      expect(trueColor(16, 185, 129)).toEqual({ r: 16, g: 185, b: 129 });
    });

    it("clamps negative values to 0", () => {
      expect(trueColor(-10, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("clamps values above 255 to 255", () => {
      expect(trueColor(300, 300, 300)).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe("colorToHex", () => {
    it("converts RGB to hex", () => {
      expect(colorToHex({ r: 16, g: 185, b: 129 })).toBe("#10b981");
    });

    it("pads single-digit hex with zero", () => {
      expect(colorToHex({ r: 0, g: 10, b: 15 })).toBe("#000a0f");
    });

    it("handles white and black", () => {
      expect(colorToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
      expect(colorToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    });
  });

  describe("relativeLuminance", () => {
    it("returns 0 for pure black", () => {
      expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 3);
    });

    it("returns 1 for pure white", () => {
      expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 3);
    });

    it("green contributes more than blue (7152 > 0722)", () => {
      const greenOnly: RgbColor = { r: 0, g: 255, b: 0 };
      const blueOnly: RgbColor = { r: 0, g: 0, b: 255 };
      expect(relativeLuminance(greenOnly)).toBeGreaterThan(relativeLuminance(blueOnly));
    });
  });

  describe("contrastRatio", () => {
    it("returns ~21 for black on white", () => {
      const ratio = contrastRatio(
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
      );
      expect(ratio).toBeCloseTo(21, 0);
    });

    it("returns ~1 for identical colors", () => {
      const ratio = contrastRatio(
        { r: 128, g: 128, b: 128 },
        { r: 128, g: 128, b: 128 },
      );
      expect(ratio).toBeCloseTo(1, 0);
    });

    it("emerald on dark background has reasonable contrast", () => {
      const ratio = contrastRatio(
        { r: 78, g: 222, b: 163 },     // emerald
        { r: 30, g: 30, b: 30 },        // dark bg
      );
      expect(ratio).toBeGreaterThan(3);
    });

    it("white on dark background exceeds WCAG AA", () => {
      const ratio = contrastRatio(
        { r: 255, g: 255, b: 255 },
        { r: 30, g: 30, b: 30 },
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("parseExtendedColor", () => {
    it("parses 256-color: 38;5;196", () => {
      // codes after ;5;: the index and anything after
      const result = parseExtendedColor([5, 196, 48], 0);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.color).toEqual(xterm256Color(196));
        expect(result.consumed).toBe(1); // consumed codes[0..1], next pos is 2
      }
    });

    it("parses TrueColor: 38;2;100;200;50", () => {
      const result = parseExtendedColor([2, 100, 200, 50], 0);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.color).toEqual({ r: 100, g: 200, b: 50 });
        expect(result.consumed).toBe(3); // consumed codes[0..3], next pos is 4
      }
    });

    it("returns null for incomplete 256-color sequence", () => {
      const result = parseExtendedColor([5], 0);
      expect(result).toBeNull();
    });

    it("returns null for incomplete TrueColor sequence", () => {
      const result = parseExtendedColor([2, 100, 200], 0);
      expect(result).toBeNull();
    });

    it("returns null for unknown mode", () => {
      const result = parseExtendedColor([9, 100], 0);
      expect(result).toBeNull();
    });

    it("returns null for start >= codes.length", () => {
      expect(parseExtendedColor([], 0)).toBeNull();
      expect(parseExtendedColor([1], 5)).toBeNull();
    });
  });
});
