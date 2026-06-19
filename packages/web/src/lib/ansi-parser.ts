// ANSI 16 standard colors — indexes 0-7 (dark) and 8-15 (bright)
const ANSI_16: string[] = [
  "#000000", "#cc0000", "#4e9a06", "#c4a000",
  "#3465a4", "#75507b", "#06989a", "#d3d7cf",
  "#555753", "#ef2929", "#8ae234", "#fce94f",
  "#729fcf", "#ad7fa8", "#34e2e2", "#eeeeec",
];

interface StyleState {
  bold: boolean;
  dim: boolean;
  underline: boolean;
  reverse: boolean;
  fg: string | null;
  bg: string | null;
}

function emptyStyle(): StyleState {
  return { bold: false, dim: false, underline: false, reverse: false, fg: null, bg: null };
}

function styleToCss(s: StyleState): string {
  const rules: string[] = [];
  if (s.bold) rules.push("font-weight:bold");
  if (s.dim) rules.push("opacity:0.7");
  if (s.underline) rules.push("text-decoration:underline");
  if (s.fg) {
    rules.push(s.reverse ? `background-color:${s.fg}` : `color:${s.fg}`);
  }
  if (s.bg) {
    rules.push(s.reverse ? `color:${s.bg}` : `background-color:${s.bg}`);
  }
  return rules.join(";");
}

function isStyleEmpty(s: StyleState): boolean {
  return !s.bold && !s.dim && !s.underline && !s.reverse && !s.fg && !s.bg;
}

function applySgrCode(state: StyleState, codes: number[]): void {
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i];
    if (c === 0) {
      // Reset all
      Object.assign(state, emptyStyle());
    } else if (c === 1) {
      state.bold = true;
    } else if (c === 2) {
      state.dim = true;
    } else if (c === 4) {
      state.underline = true;
    } else if (c === 7) {
      state.reverse = true;
    } else if (c === 22) {
      state.bold = false;
      state.dim = false;
    } else if (c === 24) {
      state.underline = false;
    } else if (c === 27) {
      state.reverse = false;
    } else if (c >= 30 && c <= 37) {
      state.fg = ANSI_16[c - 30];
      state.reverse = false; // reverse only swaps fg/bg, explicit color resets it
    } else if (c >= 40 && c <= 47) {
      state.bg = ANSI_16[c - 40];
    } else if (c >= 90 && c <= 97) {
      state.fg = ANSI_16[c - 90 + 8];
    } else if (c >= 100 && c <= 107) {
      state.bg = ANSI_16[c - 100 + 8];
    } else if (c === 38) {
      // Extended foreground: 38;5;N or 38;2;R;G;B
      const result = parseExtendedColor(codes, i + 1);
      if (result) {
        state.fg = result.color;
        i = result.consumed; // skip consumed codes
      }
    } else if (c === 48) {
      // Extended background: 48;5;N or 48;2;R;G;B
      const result = parseExtendedColor(codes, i + 1);
      if (result) {
        state.bg = result.color;
        i = result.consumed;
      }
    } else if (c === 39) {
      state.fg = null; // default fg
    } else if (c === 49) {
      state.bg = null; // default bg
    }
    // Unknown codes are safely ignored (e.g. 999)
  }
}

function parseExtendedColor(codes: number[], start: number): { color: string; consumed: number } | null {
  if (start >= codes.length) return null;

  const mode = codes[start];
  if (mode === 5 && start + 1 < codes.length) {
    // 256-color: 38;5;N or 48;5;N
    return { color: xterm256Color(codes[start + 1]), consumed: start + 1 };
  }
  if (mode === 2 && start + 3 < codes.length) {
    // True color: 38;2;R;G;B or 48;2;R;G;B
    const r = codes[start + 1];
    const g = codes[start + 2];
    const b = codes[start + 3];
    return { color: `#${hex(r)}${hex(g)}${hex(b)}`, consumed: start + 3 };
  }
  return null;
}

function hex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}

function xterm256Color(n: number): string {
  if (n < 16) return ANSI_16[n];
  if (n >= 232 && n <= 255) {
    // Grayscale: 232=#080808 → 255=#eeeeee
    const g = Math.round(((n - 232) / 23) * 255);
    return `#${hex(g)}${hex(g)}${hex(g)}`;
  }
  // 6×6×6 color cube: 16-231
  const idx = n - 16;
  const r = Math.round((Math.floor(idx / 36) % 6) * (255 / 5));
  const g = Math.round((Math.floor(idx / 6) % 6) * (255 / 5));
  const b = Math.round((idx % 6) * (255 / 5));
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// Escape sequence pattern — matches CSI sequences
const CSI_RE = /\x1b\[([\d;]*)m/g;

function tokenize(input: string): Array<{ type: "text"; value: string } | { type: "sgr"; codes: number[] }> {
  const tokens: Array<{ type: "text"; value: string } | { type: "sgr"; codes: number[] }> = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CSI_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }
    const paramStr = match[1] || "0";
    const codes = paramStr.split(";").map(Number).filter((n) => !isNaN(n));
    if (codes.length > 0) {
      tokens.push({ type: "sgr", codes });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: "text", value: input.slice(lastIndex) });
  }

  return tokens;
}

// ── One-shot parser ──────────────────────────────────

export function parseAnsiToHtml(text: string): string {
  if (!text) return "";

  const tokens = tokenize(text);
  const state = emptyStyle();
  const parts: string[] = [];
  let spanOpen = false;

  for (const token of tokens) {
    if (token.type === "sgr") {
      // Close current span if open
      if (spanOpen) {
        parts.push("</span>");
        spanOpen = false;
      }
      applySgrCode(state, token.codes);
      // Open new span if style is non-empty
      if (!isStyleEmpty(state)) {
        const css = styleToCss(state);
        parts.push(`<span style="${escapeAttr(css)}">`);
        spanOpen = true;
      }
    } else {
      parts.push(escapeHtml(token.value));
    }
  }

  // Close any open span at end
  if (spanOpen) {
    parts.push("</span>");
  }

  return parts.join("");
}

// ── Incremental parser ───────────────────────────────

export interface AnsiParser {
  append(chunk: string): string;
  reset(): void;
}

export function createAnsiParser(): AnsiParser {
  let buffer = ""; // holds incomplete data (partial escape or text after last complete CSI)
  let state = emptyStyle();
  let spanOpen = false;

  function flushSpan(parts: string[]): void {
    if (spanOpen) {
      parts.push("</span>");
      spanOpen = false;
    }
  }

  function openSpan(parts: string[]): void {
    if (!isStyleEmpty(state)) {
      const css = styleToCss(state);
      parts.push(`<span style="${escapeAttr(css)}">`);
      spanOpen = true;
    }
  }

  return {
    append(chunk: string): string {
      const parts: string[] = [];
      const input = buffer + chunk;
      buffer = "";

      // Split input into segments: text between complete CSI sequences,
      // and the CSI sequences themselves. Keep trailing incomplete data.
      // We process using a manual scan to handle partial sequences.
      let i = 0;
      while (i < input.length) {
        // Look for start of escape
        const escIdx = input.indexOf("\x1b[", i);
        if (escIdx === -1) {
          // No more escapes — emit remaining text
          parts.push(escapeHtml(input.slice(i)));
          i = input.length;
          break;
        }

        // Emit text before escape
        if (escIdx > i) {
          parts.push(escapeHtml(input.slice(i, escIdx)));
        }

        // Find the closing 'm' of this CSI
        const mIdx = input.indexOf("m", escIdx);
        if (mIdx === -1) {
          // Incomplete CSI — buffer from escIdx and stop processing
          buffer = input.slice(escIdx);
          i = input.length;
          break;
        }

        // Complete CSI found
        const csi = input.slice(escIdx + 2, mIdx); // strip \x1b[ and m
        const codes = csi.length === 0 ? [0] : csi.split(";").map(Number).filter((n) => !isNaN(n));
        if (codes.length > 0) {
          flushSpan(parts);
          applySgrCode(state, codes);
          openSpan(parts);
        }
        i = mIdx + 1;
      }

      return parts.join("");
    },

    reset(): void {
      buffer = "";
      state = emptyStyle();
      spanOpen = false;
    },
  };
}

// ── Helpers ──────────────────────────────────────────

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
