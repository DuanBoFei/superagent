import type { RgbColor } from "../../types/terminal";

// Standard 16-color palette — VTE-based, dark-background optimized
const ANSI_16_COLORS: RgbColor[] = [
  { r: 12, g: 12, b: 12 },    // 0: Black
  { r: 204, g: 0, b: 0 },     // 1: Red
  { r: 78, g: 154, b: 6 },    // 2: Green
  { r: 196, g: 160, b: 0 },   // 3: Yellow
  { r: 52, g: 101, b: 164 },  // 4: Blue
  { r: 117, g: 80, b: 123 },  // 5: Magenta
  { r: 6, g: 152, b: 154 },   // 6: Cyan
  { r: 211, g: 215, b: 207 }, // 7: White
  { r: 85, g: 87, b: 83 },    // 8: Bright Black
  { r: 239, g: 41, b: 41 },   // 9: Bright Red
  { r: 138, g: 226, b: 52 },  // 10: Bright Green
  { r: 252, g: 233, b: 79 },  // 11: Bright Yellow
  { r: 114, g: 159, b: 207 }, // 12: Bright Blue
  { r: 173, g: 127, b: 168 }, // 13: Bright Magenta
  { r: 52, g: 226, b: 226 },  // 14: Bright Cyan
  { r: 238, g: 238, b: 236 }, // 15: Bright White
];

// Dark-theme optimized palette — boosted luminance for dark backgrounds (#1e1e1e)
const ANSI_16_DARK: RgbColor[] = [
  { r: 30, g: 30, b: 30 },    // 0: Black (lighter to distinguish from bg)
  { r: 255, g: 85, b: 85 },   // 1: Red
  { r: 96, g: 216, b: 40 },   // 2: Green
  { r: 255, g: 213, b: 80 },  // 3: Yellow
  { r: 86, g: 156, b: 255 },  // 4: Blue
  { r: 207, g: 130, b: 220 }, // 5: Magenta
  { r: 40, g: 213, b: 213 },  // 6: Cyan
  { r: 220, g: 220, b: 220 }, // 7: White
  { r: 100, g: 100, b: 100 }, // 8: Bright Black
  { r: 255, g: 100, b: 100 }, // 9: Bright Red
  { r: 170, g: 255, b: 90 },  // 10: Bright Green
  { r: 255, g: 240, b: 100 }, // 11: Bright Yellow
  { r: 140, g: 185, b: 255 }, // 12: Bright Blue
  { r: 230, g: 160, b: 255 }, // 13: Bright Magenta
  { r: 90, g: 255, b: 255 },  // 14: Bright Cyan
  { r: 255, g: 255, b: 255 }, // 15: Bright White
];

// sRGB luminance weights (ITU-R BT.709)
const LUM_R = 0.2126;
const LUM_G = 0.7152;
const LUM_B = 0.0722;

export function colorToHex(c: RgbColor): string {
  return `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`;
}

export function colorToRgb(c: RgbColor): string {
  return `${c.r},${c.g},${c.b}`;
}

function hex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

export function ansi16Color(index: number, darkTheme: boolean = true): RgbColor {
  const clamped = Math.max(0, Math.min(15, index));
  return darkTheme ? ANSI_16_DARK[clamped] : ANSI_16_COLORS[clamped];
}

export function xterm256Color(index: number): RgbColor {
  if (index < 16) return ansi16Color(index);
  if (index >= 232 && index <= 255) {
    // Grayscale ramp: 232 → #080808, 255 → #eeeeee
    const g = Math.round(((index - 232) / 23) * 255);
    return { r: g, g, b: g };
  }
  // 6×6×6 color cube: 16-231
  const idx = index - 16;
  const r = Math.round(Math.floor(idx / 36) % 6 * (255 / 5));
  const gVal = Math.round(Math.floor(idx / 6) % 6 * (255 / 5));
  const b = Math.round(idx % 6 * (255 / 5));
  return { r, g: gVal, b };
}

export function trueColor(r: number, g: number, b: number): RgbColor {
  return {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
  };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function relativeLuminance(c: RgbColor): number {
  // Normalize sRGB to linear 0-1
  const rs = srgbLinear(c.r / 255);
  const gs = srgbLinear(c.g / 255);
  const bs = srgbLinear(c.b / 255);
  return LUM_R * rs + LUM_G * gs + LUM_B * bs;
}

function srgbLinear(ch: number): number {
  return ch <= 0.04045 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4);
}

export function contrastRatio(fg: RgbColor, bg: RgbColor): number {
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

// Parse 38;5;N or 48;5;N (256-color) or 38;2;R;G;B or 48;2;R;G;B (TrueColor)
// Returns the resolved RGB and how many code positions were consumed
export function parseExtendedColor(
  codes: number[],
  start: number,
): { color: RgbColor; consumed: number } | null {
  if (start >= codes.length) return null;

  const mode = codes[start];
  if (mode === 5 && start + 1 < codes.length) {
    return { color: xterm256Color(codes[start + 1]), consumed: start + 1 };
  }
  if (mode === 2 && start + 3 < codes.length) {
    return {
      color: trueColor(codes[start + 1], codes[start + 2], codes[start + 3]),
      consumed: start + 3,
    };
  }
  return null;
}
