import React, { useMemo } from "react";
import { parseAnsiToHtml } from "../../../lib/ansi-parser";
import { TerminalLine as TerminalLineComp, buildLineHtml } from "./TerminalLine";
import { TerminalCursor } from "./TerminalCursor";
import { CopyButton, escapeForDataAttr } from "./TerminalCopy";
import type { TerminalLine } from "../../../types/terminal";

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export interface TerminalRendererProps {
  content: string;
  maxLines?: number;
  fontSize?: number;
  lineHeight?: number;
  enableBlink?: boolean;
  onCopy?: (content: string) => void;
  onShowAll?: () => void;
}

export function TerminalRenderer({
  content,
  maxLines = 10000,
  fontSize = 13,
  lineHeight = 1.2,
  enableBlink = false,
  onCopy,
  onShowAll,
}: TerminalRendererProps) {
  if (!content) {
    return (
      <pre
        className="terminal-renderer"
        style={{
          fontFamily: MONO_FONT_STACK,
          fontSize: `${fontSize}px`,
          lineHeight,
          minHeight: `${lineHeight}em`,
          background: "#1e1e1e",
          color: "#d4d4d4",
          padding: "8px",
          margin: 0,
          overflowX: "auto",
          whiteSpace: "pre",
          borderRadius: "4px",
        }}
        data-terminal-empty="true"
      />
    );
  }

  const html = parseAnsiToHtml(content);
  const lines = html.split("\n");
  const truncated = lines.length > maxLines ? lines.slice(0, maxLines) : lines;

  return (
    <div style={{ position: "relative" }}>
      <CopyButton rawContent={content} onCopy={onCopy} />
      {enableBlink && (
        <style>{"@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}"}</style>
      )}
      <pre
        className="terminal-renderer"
        style={{
          fontFamily: MONO_FONT_STACK,
          fontSize: `${fontSize}px`,
          lineHeight,
          background: "#1e1e1e",
          color: "#d4d4d4",
          padding: "8px",
          margin: 0,
          overflowX: "auto",
          whiteSpace: "pre",
          borderRadius: "4px",
        }}
        data-terminal-lines={truncated.length}
        role="log"
        aria-label="Terminal output"
      >
        {truncated.map((line, i) => (
          <span
            key={i}
            className="terminal-line"
            style={{
              display: "block",
              minHeight: `${lineHeight}em`,
              fontFamily: MONO_FONT_STACK,
              fontSize: `${fontSize}px`,
              lineHeight,
            }}
            dangerouslySetInnerHTML={{ __html: line || " " }}
          />
        ))}
      </pre>
      {lines.length > maxLines && (
        <div className="terminal-truncated-notice text-neutral-500 text-xs px-2 py-1">
          Showing {maxLines} of {lines.length} lines.{" "}
          <button type="button" className="text-blue-400 hover:underline" onClick={onShowAll}>
            Show all
          </button>
        </div>
      )}
    </div>
  );
}

// ── Buffer-based rendering (from TerminalLine[] array) ──

export interface TerminalFromLinesProps {
  lines: TerminalLine[];
  maxLines?: number;
  fontSize?: number;
  lineHeight?: number;
  enableBlink?: boolean;
  cursorX?: number;
  cursorY?: number;
  cursorVisible?: boolean;
  cursorStyle?: "block" | "underline" | "bar";
}

export function TerminalFromLines({
  lines,
  maxLines = 10000,
  fontSize = 13,
  lineHeight = 1.2,
  enableBlink = false,
  cursorX = -1,
  cursorY = -1,
  cursorVisible = true,
  cursorStyle = "block",
}: TerminalFromLinesProps) {
  if (lines.length === 0) {
    return <TerminalRenderer content="" fontSize={fontSize} lineHeight={lineHeight} enableBlink={enableBlink} />;
  }

  const visible = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;
  const truncatedCount = lines.length - visible.length;

  return (
    <div>
      {enableBlink && (
        <style>{"@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}"}</style>
      )}
      {truncatedCount > 0 && (
        <div className="terminal-truncated-notice text-neutral-500 text-xs px-2 py-1">
          +{truncatedCount} earlier lines ({lines.length} total)
        </div>
      )}
      <pre
        className="terminal-renderer"
        style={{
          fontFamily: MONO_FONT_STACK,
          fontSize: `${fontSize}px`,
          lineHeight,
          background: "#1e1e1e",
          color: "#d4d4d4",
          padding: "8px",
          margin: 0,
          overflowX: "auto",
          whiteSpace: "pre",
          borderRadius: "4px",
        }}
        data-terminal-lines={visible.length}
        role="log"
        aria-label="Terminal output"
      >
        {visible.map((line, i) => (
          <TerminalLineComp key={i} line={line} enableBlink={enableBlink} fontSize={fontSize} lineHeight={lineHeight} />
        ))}
        {cursorVisible && cursorX >= 0 && cursorY >= 0 && (
          <TerminalCursor
            pos={{ x: cursorX, y: cursorY - (lines.length - visible.length) }}
            style={cursorStyle}
            enableBlink={enableBlink}
          />
        )}
      </pre>
    </div>
  );
}

// ── Backward-compat HTML string renderers (used by cards/ during migration) ──

function renderCursorHtml(pos: { x: number; y: number }, style: "block" | "underline" | "bar", enableBlink: boolean): string {
  if (pos.x < 0 || pos.y < 0) return "";
  const classNames = ["terminal-cursor", `terminal-cursor--${style}`];
  const animStyle = enableBlink ? "animation:cursor-blink 1s step-end infinite;" : "";
  return `<span class="${classNames.join(" ")}" data-cursor-x="${pos.x}" data-cursor-y="${pos.y}" style="${animStyle}"></span>`;
}

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

  const html = parseAnsiToHtml(content);
  const lines = html.split("\n");
  const truncated = lines.length > maxLines ? lines.slice(0, maxLines) : lines;

  const lineEls = truncated.map((line) => {
    const lineContent = line || " ";
    return `<span class="terminal-line" style="display:block;min-height:${lineHeight}em;font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight}">${lineContent}</span>`;
  });

  const truncatedNotice = lines.length > maxLines
    ? `<div class="terminal-truncated-notice text-neutral-500 text-xs px-2 py-1">Showing ${maxLines} of ${lines.length} lines. <button type="button" class="text-blue-400 hover:underline" data-action="show-all-terminal">Show all</button></div>`
    : "";

  const blinkStyles = enableBlink
    ? "<style>@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}</style>"
    : "";

  const rawContent = escapeForDataAttr(content);
  return `${blinkStyles}<pre class="terminal-renderer" style="font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight};background:#1e1e1e;color:#d4d4d4;padding:8px;margin:0;overflow-x:auto;white-space:pre;border-radius:4px" data-terminal-lines="${truncated.length}" data-terminal-content="${rawContent}" role="log" aria-label="Terminal output">${lineEls.join("\n")}</pre>${truncatedNotice}`;
}

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

  const visible = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;
  const truncatedCount = lines.length - visible.length;

  const lineEls = visible.map((line) => {
    return buildLineHtml(line, enableBlink)
      ? `<span class="terminal-line" style="font-family:${MONO_FONT_STACK};font-size:${fontSize}px;line-height:${lineHeight}">${buildLineHtml(line, enableBlink)}</span>`
      : "";
  });

  let cursorHtml = "";
  if (cursorVisible && cursorX >= 0 && cursorY >= 0) {
    const cursorLineIndex = cursorY - (lines.length - visible.length);
    if (cursorLineIndex >= 0 && cursorLineIndex < visible.length) {
      cursorHtml = renderCursorHtml({ x: cursorX, y: cursorLineIndex }, cursorStyle, enableBlink);
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
