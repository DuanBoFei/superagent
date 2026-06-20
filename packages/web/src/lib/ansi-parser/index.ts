import type { TerminalAttributes } from "../../types/terminal";
import { ansi16Color, colorToHex, parseExtendedColor } from "./colors";

// ── Re-export sub-modules ───────────────────────────────
export {
  ansi16Color,
  xterm256Color,
  trueColor,
  colorToHex,
  colorToRgb,
  relativeLuminance,
  contrastRatio,
  parseExtendedColor,
} from "./colors";

export {
  createDefaultAttributes,
  applySgrCodes,
  attributesToCssInline,
  hasAttributes,
  attributesEqual,
} from "./sgr";

export {
  createCursorState,
  cursorUp,
  cursorDown,
  cursorForward,
  cursorBack,
  cursorNextLine,
  cursorPrevLine,
  cursorPosition,
  cursorColumn,
  cursorShow,
  cursorHide,
  cursorSave,
  cursorRestore,
} from "./cursor";
export type { CursorState, CursorSnapshot } from "./cursor";

export {
  emptyCell,
  eraseLine,
  clearDisplay,
  eraseInLine,
  createAlternateScreenState,
  isAlternateScreenActive,
  createScrollRegion,
  scrollUp,
  scrollDown,
} from "./screen";
export type { AlternateScreenState, ScrollRegion } from "./screen";

export {
  parseOsc8,
  createOscHandler,
  renderHyperlink,
} from "./osc";
export type { HyperlinkState, OscHandler } from "./osc";

// ── Helpers ─────────────────────────────────────────────

function emptyStyle(): TerminalAttributes {
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

function isStyleEmpty(attrs: TerminalAttributes): boolean {
  return !(
    attrs.foreground || attrs.background || attrs.bold || attrs.dim ||
    attrs.italic || attrs.underline || attrs.inverse || attrs.hidden ||
    attrs.strikethrough
  );
}

function styleToCss(attrs: TerminalAttributes): string {
  const rules: string[] = [];
  if (attrs.bold) rules.push("font-weight:bold");
  if (attrs.dim) rules.push("opacity:0.7");
  if (attrs.underline) rules.push("text-decoration:underline");
  if (attrs.strikethrough) rules.push("text-decoration:line-through");
  if (attrs.italic) rules.push("font-style:italic");
  if (attrs.hidden) rules.push("visibility:hidden");

  const effFg = attrs.inverse ? attrs.background : attrs.foreground;
  const effBg = attrs.inverse ? attrs.foreground : attrs.background;

  if (effFg) rules.push(`color:${colorToHex(effFg)}`);
  if (effBg) rules.push(`background-color:${colorToHex(effBg)}`);
  return rules.join(";");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applySgr(attrs: TerminalAttributes, codes: number[]): void {
  let i = 0;
  while (i < codes.length) {
    const c = codes[i];
    if (c === 0) {
      Object.assign(attrs, emptyStyle());
    } else if (c === 1) {
      attrs.bold = true;
    } else if (c === 2) {
      attrs.dim = true;
    } else if (c === 3) {
      attrs.italic = true;
    } else if (c === 4) {
      attrs.underline = true;
    } else if (c === 5) {
      attrs.blink = true;
    } else if (c === 7) {
      attrs.inverse = true;
    } else if (c === 8) {
      attrs.hidden = true;
    } else if (c === 9) {
      attrs.strikethrough = true;
    } else if (c === 22) {
      attrs.bold = false; attrs.dim = false;
    } else if (c === 23) {
      attrs.italic = false;
    } else if (c === 24) {
      attrs.underline = false;
    } else if (c === 25) {
      attrs.blink = false;
    } else if (c === 27) {
      attrs.inverse = false;
    } else if (c === 28) {
      attrs.hidden = false;
    } else if (c === 29) {
      attrs.strikethrough = false;
    } else if (c >= 30 && c <= 37) {
      attrs.foreground = ansi16Color(c - 30);
    } else if (c >= 40 && c <= 47) {
      attrs.background = ansi16Color(c - 40);
    } else if (c === 39) {
      attrs.foreground = null;
    } else if (c === 49) {
      attrs.background = null;
    } else if (c >= 90 && c <= 97) {
      attrs.foreground = ansi16Color(c - 90 + 8);
    } else if (c >= 100 && c <= 107) {
      attrs.background = ansi16Color(c - 100 + 8);
    } else if (c === 38 || c === 48) {
      const result = parseExtendedColor(codes, i + 1);
      if (result) {
        if (c === 38) attrs.foreground = result.color;
        else attrs.background = result.color;
        i = result.consumed;
      }
    }
    i++;
  }
}

// ── ESC/Ctrl char detection ─────────────────────────────

function isFinalByte(cc: number): boolean {
  return cc >= 0x40 && cc <= 0x7e;
}

// ── One-shot parser ─────────────────────────────────────

export function parseAnsiToHtml(text: string): string {
  if (!text) return "";
  const parser = createAnsiParser();
  const html = parser.append(text);
  const tail = parser.flush();
  return html + tail;
}

// ── Incremental parser ──────────────────────────────────

export interface AnsiParser {
  append(chunk: string): string;
  flush(): string;
  reset(): void;
}

export function createAnsiParser(): AnsiParser {
  let state: "normal" | "escape" | "csi" | "osc" = "normal";
  let csiParams = "";
  let currentAttributes: TerminalAttributes = emptyStyle();
  let pendingBuf = "";

  let spanOpen = false;

  return {
    append(chunk: string): string {
      const parts: string[] = [];
      const input = pendingBuf + chunk;
      pendingBuf = "";

      let i = 0;

      function flushSpan(): void {
        if (spanOpen) {
          parts.push("</span>");
          spanOpen = false;
        }
      }

      function openSpan(): void {
        if (!isStyleEmpty(currentAttributes)) {
          const css = styleToCss(currentAttributes);
          parts.push(`<span style="${escapeAttr(css)}">`);
          spanOpen = true;
        }
      }

      while (i < input.length) {
        if (state === "normal") {
          if (input[i] === "\x1b") {
            state = "escape";
            i++;
          } else if (input[i] === "\x07") {
            parts.push('<span class="bell-flash" aria-label="bell"></span>');
            i++;
          } else {
            parts.push(escapeHtml(input[i]));
            i++;
          }
          continue;
        }

        if (state === "escape") {
          if (input[i] === "[") {
            state = "csi";
            csiParams = "";
            i++;
          } else if (input[i] === "]") {
            state = "osc";
            i++;
          } else {
            // Unknown escape sequence — ignore
            state = "normal";
            i++;
          }
          continue;
        }

        if (state === "csi") {
          const cc = input.charCodeAt(i);
          if (isFinalByte(cc)) {
            const cmd = input[i];
            csiParams += cmd;

            if (cmd === "m") {
              // SGR sequence
              // Strip the final 'm', split by ";", parse numbers
              const numStr = csiParams.slice(0, -1); // remove 'm'
              const codes = numStr.length === 0
                ? [0]
                : numStr.split(";").map(Number).filter((n) => !isNaN(n));

              if (codes.length > 0) {
                flushSpan();
                applySgr(currentAttributes, codes);
                openSpan();
              }
            }
            // Non-SGR CSI sequences ignored in basic parser

            state = "normal";
            i++;
          } else {
            csiParams += input[i];
            i++;
          }
          continue;
        }

        if (state === "osc") {
          if (input[i] === "\x07") {
            // BEL termination
            state = "normal";
            i++;
          } else if (input[i] === "\x1b" && i + 1 < input.length && input[i + 1] === "\\") {
            // ST termination
            state = "normal";
            i += 2;
          } else {
            i++;
          }
          continue;
        }
      }

      return parts.join("");
    },

    flush(): string {
      const parts: string[] = [];
      if (spanOpen) {
        parts.push("</span>");
        spanOpen = false;
      }
      return parts.join("");
    },

    reset(): void {
      state = "normal";
      csiParams = "";
      currentAttributes = emptyStyle();
      pendingBuf = "";
      spanOpen = false;
    },
  };
}
