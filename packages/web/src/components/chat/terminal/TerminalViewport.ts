import type { TerminalLine } from "../../../types/terminal";
import { renderTerminalLine } from "./TerminalLine";
import { renderTerminalCursor } from "./TerminalCursor";
import { getVisibleLineRange } from "../../../hooks/use-terminal-virtual-scroll";

export interface TerminalViewportOptions {
  fontSize?: number;
  lineHeight?: number;
  viewportHeight: number;
  scrollTop: number;
  enableBlink?: boolean;
  cursorX?: number;
  cursorY?: number;
  cursorVisible?: boolean;
  cursorStyle?: "block" | "underline" | "bar";
  virtualScrollThreshold?: number;
  overscan?: number;
}

const MONO_FONT_STACK = "Consolas,Monaco,'Source Code Pro',monospace";

// Renders only visible terminal lines based on viewport scroll state.
// Returns full HTML for the terminal viewport with virtual scrolling support.
export function renderTerminalViewport(
  lines: TerminalLine[],
  options: TerminalViewportOptions,
): string {
  const {
    fontSize = 13,
    lineHeight = 1.2,
    viewportHeight,
    scrollTop,
    enableBlink = false,
    cursorX = -1,
    cursorY = -1,
    cursorVisible = true,
    cursorStyle = "block",
    virtualScrollThreshold = 500,
    overscan = 3,
  } = options;

  const itemHeight = Math.round(fontSize * lineHeight);
  const totalHeight = lines.length * itemHeight;

  if (lines.length === 0) {
    return `<div class="terminal-viewport" style="height:${viewportHeight}px;overflow-y:auto;background:#1e1e1e;border-radius:4px" role="log" aria-label="Terminal output"><div class="terminal-content" style="position:relative;min-height:100%"></div></div>`;
  }

  // Determine visible range
  const range = lines.length >= virtualScrollThreshold
    ? getVisibleLineRange(lines.length, scrollTop, viewportHeight, itemHeight, overscan)
    : { start: 0, end: lines.length };

  // Top spacer for virtual scrolling
  const topPadding = range.start * itemHeight;
  const bottomPadding = totalHeight - range.end * itemHeight;

  // Render only visible lines
  const visibleLines = lines.slice(range.start, range.end);
  const lineEls = visibleLines.map((line, i) => {
    const actualIndex = range.start + i;
    return `<span class="terminal-line-wrapper" style="position:absolute;top:${actualIndex * itemHeight}px;left:0;right:0;height:${itemHeight}px">${renderTerminalLine(line, { enableBlink, fontSize, lineHeight })}</span>`;
  });

  // Cursor rendering
  let cursorHtml = "";
  if (cursorVisible && cursorX >= 0 && cursorY >= 0) {
    const cursorInRange = cursorY >= range.start && cursorY < range.end;
    if (cursorInRange || lines.length < virtualScrollThreshold) {
      const cursorTop = cursorY * itemHeight;
      cursorHtml = `<span style="position:absolute;top:${cursorTop}px;left:${cursorX * (fontSize * 0.6)}px;height:${itemHeight}px">${renderTerminalCursor({ x: cursorX, y: cursorY }, { style: cursorStyle, enableBlink })}</span>`;
    }
  }

  const blinkStyles = enableBlink
    ? "<style>@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}</style>"
    : "";

  return `${blinkStyles}<div class="terminal-viewport" style="height:${viewportHeight}px;overflow-y:auto;background:#1e1e1e;border-radius:4px;font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight}" data-terminal-lines="${lines.length}" data-virtual-scroll="${lines.length >= virtualScrollThreshold}" role="log" aria-label="Terminal output"><div class="terminal-content" style="position:relative;height:${totalHeight}px">${topPadding > 0 ? `<div style="height:${topPadding}px"></div>` : ""}${lineEls.join("\n")}${bottomPadding > 0 ? `<div style="height:${bottomPadding}px"></div>` : ""}${cursorHtml}</div></div>`;
}
