import { parseAnsiToHtml } from "../../../lib/ansi-parser";
import { renderTerminalLine } from "./TerminalLine";
import { renderTerminalCursor } from "./TerminalCursor";
import { escapeForDataAttr } from "./TerminalCopy";
import type { TerminalLine } from "../../../types/terminal";
import { createDefaultAttributes } from "../../../lib/ansi-parser/sgr";

export interface TerminalRendererOptions {
  maxLines?: number;
  fontSize?: number;
  lineHeight?: number;
  enableBell?: boolean;
  enableBellSound?: boolean;
  enableBlink?: boolean;
  enableAlternateScreen?: boolean;
  enableContrastAdjustment?: boolean;
  virtualScrollThreshold?: number;
}

const MONO_FONT_STACK = "Consolas,Monaco,'Source Code Pro',monospace";

// Render ANSI terminal content as HTML.
// For complex cursor/screen features (alternate screen, cursor positioning),
// use the TerminalBuffer + TerminalRenderer integration (T015/T019).
export function renderTerminal(
  content: string,
  options: TerminalRendererOptions = {},
): string {
  const {
    maxLines = 10000,
    fontSize = 13,
    lineHeight = 1.2,
    enableBlink = false,
  } = options;

  if (!content) {
    return `<pre class="terminal-renderer" style="font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight};min-height:${lineHeight}em;background:#1e1e1e;color:#d4d4d4;padding:8px;margin:0;overflow-x:auto;white-space:pre;border-radius:4px" data-terminal-empty="true"></pre>`;
  }

  // Parse ANSI to styled HTML
  const html = parseAnsiToHtml(content);

  // Split into lines, respecting maxLines
  const lines = html.split("\n");
  const truncated = lines.length > maxLines ? lines.slice(0, maxLines) : lines;
  const lineCount = truncated.length;

  // Build line elements
  const lineEls = truncated.map((line, i) => {
    // Wrap each line for consistent height
    const lineContent = line || " ";
    return `<span class="terminal-line" style="display:block;min-height:${lineHeight}em;font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight}">${lineContent}</span>`;
  });

  const totalLines = lines.length;
  const truncatedNotice = totalLines > maxLines
    ? `<div class="terminal-truncated-notice text-neutral-500 text-xs px-2 py-1">Showing ${maxLines} of ${totalLines} lines. <button type="button" class="text-blue-400 hover:underline" data-action="show-all-terminal">Show all</button></div>`
    : "";

  const blinkStyles = enableBlink
    ? "<style>@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}</style>"
    : "";

  // Store raw content for clipboard copy
  const rawContent = escapeForDataAttr(content);
  return `${blinkStyles}<pre class="terminal-renderer" style="font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight};background:#1e1e1e;color:#d4d4d4;padding:8px;margin:0;overflow-x:auto;white-space:pre;border-radius:4px" data-terminal-lines="${lineCount}" data-terminal-content="${rawContent}" role="log" aria-label="Terminal output">${lineEls.join("\n")}</pre>${truncatedNotice}`;
}

// Render terminal content from a TerminalLine array (buffer-based rendering).
// This is used by the full TerminalBuffer integration path.
export function renderTerminalFromLines(
  lines: TerminalLine[],
  options: TerminalRendererOptions & { cursorX?: number; cursorY?: number; cursorVisible?: boolean; cursorStyle?: "block" | "underline" | "bar" } = {},
): string {
  const {
    maxLines = 10000,
    fontSize = 13,
    lineHeight = 1.2,
    enableBlink = false,
    cursorX = -1,
    cursorY = -1,
    cursorVisible = true,
    cursorStyle = "block",
  } = options;

  if (lines.length === 0) {
    return renderTerminal("", options);
  }

  // Apply maxLines
  const visible = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;
  const truncatedCount = lines.length - visible.length;

  const lineEls = visible.map((line) => {
    return renderTerminalLine(line, { enableBlink, fontSize, lineHeight });
  });

  // Render cursor if within visible range
  let cursorHtml = "";
  if (cursorVisible && cursorX >= 0 && cursorY >= 0) {
    const cursorLineIndex = cursorY - (lines.length - visible.length);
    if (cursorLineIndex >= 0 && cursorLineIndex < visible.length) {
      cursorHtml = renderTerminalCursor({ x: cursorX, y: cursorLineIndex }, { style: cursorStyle, enableBlink });
    }
  }

  const truncatedNotice = truncatedCount > 0
    ? `<div class="terminal-truncated-notice text-neutral-500 text-xs px-2 py-1">+${truncatedCount} earlier lines (${lines.length} total)</div>`
    : "";

  const blinkStyles = enableBlink
    ? "<style>@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}</style>"
    : "";

  return `${blinkStyles}${truncatedNotice}<pre class="terminal-renderer" style="font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight};background:#1e1e1e;color:#d4d4d4;padding:8px;margin:0;overflow-x:auto;white-space:pre;border-radius:4px" data-terminal-lines="${visible.length}" role="log" aria-label="Terminal output">${lineEls.join("\n")}${cursorHtml}</pre>`;
}
