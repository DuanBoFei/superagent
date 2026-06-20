import type { TerminalLine, TerminalCell, TerminalAttributes } from "../../../types/terminal";
import { attributesToCssInline, createDefaultAttributes, attributesEqual } from "../../../lib/ansi-parser/sgr";

export interface TerminalLineOptions {
  enableBlink?: boolean;
  fontSize?: number;
  lineHeight?: number;
}

const BLINK_KEYFRAMES = "@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isDefaultAttrs(attrs: TerminalAttributes): boolean {
  return !(
    attrs.foreground || attrs.background || attrs.bold || attrs.dim ||
    attrs.italic || attrs.underline || attrs.blink || attrs.inverse ||
    attrs.hidden || attrs.strikethrough
  );
}

function cellStyle(attrs: TerminalAttributes, enableBlink: boolean): string {
  const base = attributesToCssInline(attrs);
  const parts: string[] = [];
  if (base) parts.push(base);
  if (attrs.blink && enableBlink) {
    parts.push("animation:terminal-blink 1s step-end infinite");
  }
  return parts.join(";");
}

const MONO_FONT_STACK = "Consolas,Monaco,'Source Code Pro',monospace";

// Render a single terminal line to HTML.
// Groups consecutive cells with identical attributes into shared spans.
export function renderTerminalLine(
  line: TerminalLine,
  options: TerminalLineOptions = {},
): string {
  const { enableBlink = false, fontSize = 13, lineHeight = 1.2 } = options;
  const cells = line.cells;

  if (cells.length === 0) return "";

  const parts: string[] = [];
  let runStart = 0;

  for (let i = 1; i <= cells.length; i++) {
    const runEnded = i === cells.length || !attributesEqual(cells[i].attributes, cells[runStart].attributes);

    if (runEnded) {
      const runCells = cells.slice(runStart, i);
      const runAttrs = runCells[0].attributes;
      const text = runCells.map((c) => c.char).join("");

      if (isDefaultAttrs(runAttrs) && !(runAttrs.blink && enableBlink)) {
        parts.push(escapeHtml(text));
      } else {
        const style = cellStyle(runAttrs, enableBlink);
        const styleAttr = style ? ` style="${style.replace(/"/g, "&quot;")}"` : "";
        parts.push(`<span${styleAttr}>${escapeHtml(text)}</span>`);
      }

      runStart = i;
    }
  }

  return `<span class="terminal-line" style="font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight}">${parts.join("")}</span>`;
}

// Render the blink keyframes <style> tag (include once in page <head>)
export function renderTerminalBlinkStyles(): string {
  return `<style>${BLINK_KEYFRAMES}</style>`;
}
