import React from "react";
import type { TerminalLine as TerminalLineType, TerminalAttributes } from "../../../types/terminal";
import { attributesToCssInline, attributesEqual } from "../../../lib/ansi-parser/sgr";

const MONO_FONT_STACK = "Consolas,Monaco,'Source Code Pro',monospace";

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

export function buildLineHtml(
  line: TerminalLineType,
  enableBlink: boolean,
): string {
  const { cells } = line;
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

  return parts.join("");
}

export interface TerminalLineProps {
  line: TerminalLineType;
  enableBlink?: boolean;
  fontSize?: number;
  lineHeight?: number;
}

export function TerminalLine({
  line,
  enableBlink = false,
  fontSize = 13,
  lineHeight = 1.2,
}: TerminalLineProps) {
  const html = buildLineHtml(line, enableBlink);
  if (!html) return null;

  return (
    <span
      className="terminal-line"
      style={{ fontFamily: MONO_FONT_STACK, fontSize: `${fontSize}px`, lineHeight }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
