import React, { useMemo } from "react";
import type { TerminalLine } from "../../../types/terminal";
import { TerminalLine as TerminalLineComp } from "./TerminalLine";
import { TerminalCursor } from "./TerminalCursor";
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

export interface TerminalViewportProps {
  lines: TerminalLine[];
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

export function TerminalViewport({
  lines,
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
}: TerminalViewportProps) {
  const itemHeight = Math.round(fontSize * lineHeight);
  const totalHeight = lines.length * itemHeight;

  const range = useMemo(() => {
    if (lines.length === 0) return { start: 0, end: 0 };
    if (lines.length >= virtualScrollThreshold) {
      return getVisibleLineRange(lines.length, scrollTop, viewportHeight, itemHeight, overscan);
    }
    return { start: 0, end: lines.length };
  }, [lines.length, scrollTop, viewportHeight, itemHeight, virtualScrollThreshold, overscan]);

  if (lines.length === 0) {
    return (
      <div
        className="terminal-viewport"
        style={{ height: `${viewportHeight}px`, overflowY: "auto", background: "#1e1e1e", borderRadius: "4px" }}
        role="log"
        aria-label="Terminal output"
      >
        <div className="terminal-content" style={{ position: "relative", minHeight: "100%" }} />
      </div>
    );
  }

  const topPadding = range.start * itemHeight;
  const bottomPadding = totalHeight - range.end * itemHeight;
  const visibleLines = lines.slice(range.start, range.end);

  return (
    <div>
      {enableBlink && (
        <style>{"@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}"}</style>
      )}
      <div
        className="terminal-viewport"
        style={{
          height: `${viewportHeight}px`,
          overflowY: "auto",
          background: "#1e1e1e",
          borderRadius: "4px",
          fontFamily: MONO_FONT_STACK,
          fontSize: `${fontSize}px`,
          lineHeight,
        }}
        data-terminal-lines={lines.length}
        data-virtual-scroll={lines.length >= virtualScrollThreshold}
        role="log"
        aria-label="Terminal output"
      >
        <div className="terminal-content" style={{ position: "relative", height: `${totalHeight}px` }}>
          {topPadding > 0 && <div style={{ height: `${topPadding}px` }} />}
          {visibleLines.map((line, i) => {
            const actualIndex = range.start + i;
            return (
              <span
                key={actualIndex}
                className="terminal-line-wrapper"
                style={{ position: "absolute", top: `${actualIndex * itemHeight}px`, left: 0, right: 0, height: `${itemHeight}px` }}
              >
                <TerminalLineComp line={line} enableBlink={enableBlink} fontSize={fontSize} lineHeight={lineHeight} />
              </span>
            );
          })}
          {bottomPadding > 0 && <div style={{ height: `${bottomPadding}px` }} />}
          {cursorVisible && cursorX >= 0 && cursorY >= 0 && (
            <span style={{ position: "absolute", top: `${cursorY * itemHeight}px`, left: `${cursorX * (fontSize * 0.6)}px`, height: `${itemHeight}px` }}>
              <TerminalCursor pos={{ x: cursorX, y: cursorY }} style={cursorStyle} enableBlink={enableBlink} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
