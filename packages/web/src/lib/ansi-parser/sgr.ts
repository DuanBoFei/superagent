import type { RgbColor, TerminalAttributes } from "../../types/terminal";
import { ansi16Color, colorToHex, parseExtendedColor } from "./colors";

export function createDefaultAttributes(): TerminalAttributes {
  return {
    foreground: null,
    background: null,
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    blink: false,
    inverse: false,
    hidden: false,
    strikethrough: false,
  };
}

// Apply SGR codes to attributes, returning the new attributes.
// The codes array must include the entire sequence's parameters
// (including 38/48 sub-parameters consumed by parseExtendedColor).
export function applySgrCodes(
  current: TerminalAttributes,
  codes: number[],
): TerminalAttributes {
  const attrs = { ...current };

  let i = 0;
  while (i < codes.length) {
    const c = codes[i];

    switch (c) {
      // Reset
      case 0:
        Object.assign(attrs, createDefaultAttributes());
        break;

      // Bold
      case 1:
        attrs.bold = true;
        break;
      // Dim
      case 2:
        attrs.dim = true;
        break;
      // Italic
      case 3:
        attrs.italic = true;
        break;
      // Underline
      case 4:
        attrs.underline = true;
        break;
      // Blink
      case 5:
        attrs.blink = true;
        break;
      // Inverse
      case 7:
        attrs.inverse = true;
        break;
      // Hidden
      case 8:
        attrs.hidden = true;
        break;
      // Strikethrough
      case 9:
        attrs.strikethrough = true;
        break;

      // Cancel bold/dim
      case 22:
        attrs.bold = false;
        attrs.dim = false;
        break;
      // Cancel italic
      case 23:
        attrs.italic = false;
        break;
      // Cancel underline
      case 24:
        attrs.underline = false;
        break;
      // Cancel blink
      case 25:
        attrs.blink = false;
        break;
      // Cancel inverse
      case 27:
        attrs.inverse = false;
        break;
      // Cancel hidden
      case 28:
        attrs.hidden = false;
        break;
      // Cancel strikethrough
      case 29:
        attrs.strikethrough = false;
        break;

      // Foreground 16-color (standard)
      case 30: case 31: case 32: case 33:
      case 34: case 35: case 36: case 37:
        attrs.foreground = ansi16Color(c - 30);
        break;

      // Default foreground
      case 39:
        attrs.foreground = null;
        break;

      // Background 16-color (standard)
      case 40: case 41: case 42: case 43:
      case 44: case 45: case 46: case 47:
        attrs.background = ansi16Color(c - 40);
        break;

      // Default background
      case 49:
        attrs.background = null;
        break;

      // Foreground 16-color (bright)
      case 90: case 91: case 92: case 93:
      case 94: case 95: case 96: case 97:
        attrs.foreground = ansi16Color(c - 90 + 8);
        break;

      // Background 16-color (bright)
      case 100: case 101: case 102: case 103:
      case 104: case 105: case 106: case 107:
        attrs.background = ansi16Color(c - 100 + 8);
        break;

      // Extended foreground: 38;5;N or 38;2;R;G;B
      case 38: {
        const result = parseExtendedColor(codes, i + 1);
        if (result) {
          attrs.foreground = result.color;
          i = result.consumed;
        }
        break;
      }

      // Extended background: 48;5;N or 48;2;R;G;B
      case 48: {
        const result = parseExtendedColor(codes, i + 1);
        if (result) {
          attrs.background = result.color;
          i = result.consumed;
        }
        break;
      }

      // Unknown codes are silently ignored
      default:
        break;
    }
    i++;
  }

  return attrs;
}

// Generate a CSS style string from attributes, resolving colors to inline styles.
// Uses the effective foreground/background (swapped when inverse is true).
export function attributesToCssInline(attrs: TerminalAttributes): string {
  const styles: string[] = [];

  const effectiveFg = attrs.inverse ? attrs.background : attrs.foreground;
  const effectiveBg = attrs.inverse ? attrs.foreground : attrs.background;

  if (effectiveFg) {
    styles.push(`color:${colorToHex(effectiveFg)}`);
  }
  if (effectiveBg) {
    styles.push(`background-color:${colorToHex(effectiveBg)}`);
  }
  if (attrs.bold) {
    styles.push("font-weight:700");
  }
  if (attrs.dim) {
    styles.push("opacity:0.7");
  }
  if (attrs.italic) {
    styles.push("font-style:italic");
  }
  if (attrs.underline) {
    styles.push("text-decoration:underline");
  }
  if (attrs.strikethrough) {
    styles.push("text-decoration:line-through");
  }
  // Both underline and strikethrough:
  if (attrs.underline && attrs.strikethrough) {
    styles[styles.indexOf("text-decoration:underline")] = "text-decoration:underline line-through";
    styles.splice(styles.indexOf("text-decoration:line-through"), 1);
  }
  if (attrs.hidden) {
    styles.push("visibility:hidden");
  }

  return styles.join(";");
}

// Check if attributes have any visible styling
export function hasAttributes(attrs: TerminalAttributes): boolean {
  return !!(
    attrs.foreground ||
    attrs.background ||
    attrs.bold ||
    attrs.dim ||
    attrs.italic ||
    attrs.underline ||
    attrs.strikethrough ||
    attrs.inverse ||
    attrs.hidden
  );
}

// Check if two attribute sets are equal
export function attributesEqual(
  a: TerminalAttributes,
  b: TerminalAttributes,
): boolean {
  if (a.bold !== b.bold) return false;
  if (a.dim !== b.dim) return false;
  if (a.italic !== b.italic) return false;
  if (a.underline !== b.underline) return false;
  if (a.blink !== b.blink) return false;
  if (a.inverse !== b.inverse) return false;
  if (a.hidden !== b.hidden) return false;
  if (a.strikethrough !== b.strikethrough) return false;
  if (a.foreground === null && b.foreground !== null) return false;
  if (a.foreground !== null && b.foreground === null) return false;
  if (a.foreground && b.foreground) {
    if (a.foreground.r !== b.foreground.r || a.foreground.g !== b.foreground.g || a.foreground.b !== b.foreground.b) return false;
  }
  if (a.background === null && b.background !== null) return false;
  if (a.background !== null && b.background === null) return false;
  if (a.background && b.background) {
    if (a.background.r !== b.background.r || a.background.g !== b.background.g || a.background.b !== b.background.b) return false;
  }
  return true;
}
