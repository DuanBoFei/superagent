import { describe, expect, it } from "vitest";
import {
  adjustForeground,
  adjustBackground,
  contrastRatio,
  ensureContrast,
  meetsWcagAA,
  toHex,
} from "../../../../packages/web/src/lib/color-contrast";
import type { RgbColor } from "../../../../packages/web/src/types/terminal";

const WHITE: RgbColor = { r: 255, g: 255, b: 255 };
const BLACK: RgbColor = { r: 0, g: 0, b: 0 };
const DARK_BG: RgbColor = { r: 30, g: 30, b: 30 };
const EMERALD: RgbColor = { r: 78, g: 222, b: 163 };
const DIM_RED: RgbColor = { r: 100, g: 30, b: 30 };

describe("color-contrast", () => {
  describe("contrastRatio", () => {
    it("returns ~21 for black on white", () => {
      expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 0);
    });

    it("returns ~1 for identical colors", () => {
      expect(contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 })).toBeCloseTo(1, 0);
    });

    it("is symmetric", () => {
      const a: RgbColor = { r: 50, g: 100, b: 200 };
      const b: RgbColor = { r: 200, g: 150, b: 100 };
      expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 4);
    });
  });

  describe("meetsWcagAA", () => {
    it("white on black meets AA for normal text", () => {
      expect(meetsWcagAA(WHITE, BLACK)).toBe(true);
    });

    it("dark-gray on slightly-darker-gray fails AA", () => {
      expect(meetsWcagAA({ r: 50, g: 50, b: 50 }, { r: 40, g: 40, b: 40 })).toBe(false);
    });

    it("with isLargeText=true, lower threshold (3:1) applies", () => {
      const fg: RgbColor = { r: 110, g: 110, b: 110 };
      const bg: RgbColor = { r: 30, g: 30, b: 30 };
      // ~110 vs 30 yields ratio ~3.6 — above 3:1 (large text) but below 4.5:1 (normal text)
      const ratio = contrastRatio(fg, bg);
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(4.5);
      expect(meetsWcagAA(fg, bg, true)).toBe(true);
      expect(meetsWcagAA(fg, bg, false)).toBe(false);
    });
  });

  describe("adjustForeground", () => {
    it("returns unchanged if already meeting contrast", () => {
      const result = adjustForeground(WHITE, BLACK);
      expect(result).toEqual(WHITE);
    });

    it("lightens dim foreground on dark background", () => {
      const fg: RgbColor = { r: 80, g: 40, b: 40 };
      const bg: RgbColor = { r: 30, g: 30, b: 30 };
      const initial = contrastRatio(fg, bg);
      expect(initial).toBeLessThan(4.5);
      const adjusted = adjustForeground(fg, bg);
      const adjustedRatio = contrastRatio(adjusted, bg);
      expect(adjustedRatio).toBeGreaterThanOrEqual(4.5);
      // Adjusted should be lighter
      expect(adjusted.r).toBeGreaterThan(fg.r);
    });

    it("darkens bright foreground on light background", () => {
      const fg: RgbColor = { r: 200, g: 200, b: 200 };
      const bg: RgbColor = { r: 220, g: 220, b: 220 };
      const initial = contrastRatio(fg, bg);
      expect(initial).toBeLessThan(4.5);
      const adjusted = adjustForeground(fg, bg);
      const adjustedRatio = contrastRatio(adjusted, bg);
      expect(adjustedRatio).toBeGreaterThanOrEqual(4.5);
      expect(adjusted.r).toBeLessThan(fg.r);
    });

    it("handles emerald on dark background", () => {
      const ratio = contrastRatio(EMERALD, DARK_BG);
      if (ratio < 4.5) {
        const adjusted = adjustForeground(EMERALD, DARK_BG);
        expect(contrastRatio(adjusted, DARK_BG)).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  describe("adjustBackground", () => {
    it("returns unchanged if already meeting contrast", () => {
      const result = adjustBackground(WHITE, BLACK);
      expect(result).toEqual(BLACK);
    });

    it("lightens dark background for dark foreground", () => {
      const fg: RgbColor = { r: 40, g: 40, b: 40 };
      const bg: RgbColor = { r: 30, g: 30, b: 30 };
      const result = adjustBackground(fg, bg);
      expect(contrastRatio(fg, result)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("ensureContrast", () => {
    it("returns unchanged pair if already compliant", () => {
      const result = ensureContrast(WHITE, BLACK);
      expect(result.foreground).toEqual(WHITE);
      expect(result.background).toEqual(BLACK);
    });

    it("adjusts foreground by default when contrast fails", () => {
      const fg: RgbColor = { r: 80, g: 40, b: 40 };
      const bg: RgbColor = { r: 30, g: 30, b: 30 };
      const result = ensureContrast(fg, bg);
      expect(contrastRatio(result.foreground, result.background)).toBeGreaterThanOrEqual(4.5);
      // Foreground should have changed
      expect(result.foreground).not.toEqual(fg);
    });

    it("adjusts background when preferAdjustForeground is false", () => {
      const fg: RgbColor = { r: 80, g: 40, b: 40 };
      const bg: RgbColor = { r: 30, g: 30, b: 30 };
      const result = ensureContrast(fg, bg, { preferAdjustForeground: false });
      expect(contrastRatio(result.foreground, result.background)).toBeGreaterThanOrEqual(4.5);
      expect(result.foreground).toEqual(fg);
      expect(result.background).not.toEqual(bg);
    });

    it("uses large text threshold when isLargeText is true", () => {
      const fg: RgbColor = { r: 120, g: 120, b: 120 };
      const bg: RgbColor = { r: 30, g: 30, b: 30 };
      const ratio = contrastRatio(fg, bg);
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(4.5);
      const result = ensureContrast(fg, bg, { isLargeText: true });
      // Should pass because 3:1 is enough for large text
      expect(result.foreground).toEqual(fg);
      expect(result.background).toEqual(bg);
    });
  });

  describe("toHex", () => {
    it("converts RGB to hex", () => {
      expect(toHex(EMERALD)).toBe("#4edea3");
    });

    it("pads single-digit values", () => {
      expect(toHex({ r: 0, g: 10, b: 15 })).toBe("#000a0f");
    });

    it("handles white", () => {
      expect(toHex(WHITE)).toBe("#ffffff");
    });
  });
});
