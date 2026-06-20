import type { RgbColor } from "../types/terminal";

// sRGB luminance weights (ITU-R BT.709)
const LUM_R = 0.2126;
const LUM_G = 0.7152;
const LUM_B = 0.0722;

// WCAG AA minimum for normal text
const WCAG_AA_MINIMUM = 4.5;

// WCAG AA minimum for large text (18px+ or 14px+ bold)
const WCAG_AA_LARGE = 3.0;

function srgbLinear(ch: number): number {
  return ch <= 0.04045 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4);
}

function relativeLuminance(c: RgbColor): number {
  const rs = srgbLinear(c.r / 255);
  const gs = srgbLinear(c.g / 255);
  const bs = srgbLinear(c.b / 255);
  return LUM_R * rs + LUM_G * gs + LUM_B * bs;
}

export function contrastRatio(fg: RgbColor, bg: RgbColor): number {
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAA(
  fg: RgbColor,
  bg: RgbColor,
  isLargeText: boolean = false,
): boolean {
  const min = isLargeText ? WCAG_AA_LARGE : WCAG_AA_MINIMUM;
  return contrastRatio(fg, bg) >= min;
}

// Auto-adjust foreground color to meet WCAG AA by iteratively
// lightening it (for dark backgrounds) or darkening it (for light backgrounds).
// Preserves hue while adjusting luminance.
export function adjustForeground(
  fg: RgbColor,
  bg: RgbColor,
  targetRatio: number = WCAG_AA_MINIMUM,
): RgbColor {
  const initialRatio = contrastRatio(fg, bg);
  if (initialRatio >= targetRatio) return { ...fg };

  const bgLum = relativeLuminance(bg);
  // If background is dark (< 0.5), lighten foreground. Otherwise darken.
  const shouldLighten = bgLum < 0.5;

  let adjusted = { ...fg };
  let attempts = 0;
  const maxAttempts = 50;

  while (contrastRatio(adjusted, bg) < targetRatio && attempts < maxAttempts) {
    if (shouldLighten) {
      adjusted = lightenStep(adjusted);
    } else {
      adjusted = darkenStep(adjusted);
    }
    attempts++;
  }

  return adjusted;
}

function lightenStep(c: RgbColor): RgbColor {
  return {
    r: Math.round(Math.min(255, c.r + (255 - c.r) * 0.15)),
    g: Math.round(Math.min(255, c.g + (255 - c.g) * 0.15)),
    b: Math.round(Math.min(255, c.b + (255 - c.b) * 0.15)),
  };
}

function darkenStep(c: RgbColor): RgbColor {
  return {
    r: Math.round(Math.max(0, c.r * 0.85)),
    g: Math.round(Math.max(0, c.g * 0.85)),
    b: Math.round(Math.max(0, c.b * 0.85)),
  };
}

// Auto-adjust background color to meet WCAG AA
// Strategy: move background away from foreground
export function adjustBackground(
  fg: RgbColor,
  bg: RgbColor,
  targetRatio: number = WCAG_AA_MINIMUM,
): RgbColor {
  const initialRatio = contrastRatio(fg, bg);
  if (initialRatio >= targetRatio) return { ...bg };

  // Move bg away from fg: if fg is dark, lighten bg; if fg is light, darken bg.
  const fgAvg = (fg.r + fg.g + fg.b) / 3;
  const shouldLighten = fgAvg < 128;

  let adjusted = { ...bg };
  let attempts = 0;
  const maxAttempts = 50;

  while (contrastRatio(fg, adjusted) < targetRatio && attempts < maxAttempts) {
    if (shouldLighten) {
      adjusted = lightenStep(adjusted);
    } else {
      adjusted = darkenStep(adjusted);
    }
    attempts++;
  }

  return adjusted;
}

// Ensure a foreground/background pair meets WCAG AA,
// adjusting foreground first, then background if still needed.
export function ensureContrast(
  fg: RgbColor,
  bg: RgbColor,
  options: {
    isLargeText?: boolean;
    preferAdjustForeground?: boolean;
  } = {},
): { foreground: RgbColor; background: RgbColor } {
  const min = options.isLargeText ? WCAG_AA_LARGE : WCAG_AA_MINIMUM;

  if (contrastRatio(fg, bg) >= min) {
    return { foreground: { ...fg }, background: { ...bg } };
  }

  if (options.preferAdjustForeground !== false) {
    // Adjust foreground first
    const newFg = adjustForeground(fg, bg, min);
    return { foreground: newFg, background: { ...bg } };
  }

  const newBg = adjustBackground(fg, bg, min);
  return { foreground: { ...fg }, background: newBg };
}

// Get color as CSS hex string
export function toHex(c: RgbColor): string {
  const r = c.r.toString(16).padStart(2, "0");
  const g = c.g.toString(16).padStart(2, "0");
  const b = c.b.toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
