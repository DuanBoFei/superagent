import React from "react";

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CursorOptions {
  style?: "block" | "underline" | "bar";
  visible?: boolean;
  enableBlink?: boolean;
}

export interface TerminalCursorProps {
  pos: CursorPosition;
  style?: "block" | "underline" | "bar";
  visible?: boolean;
  enableBlink?: boolean;
}

export function TerminalCursor({
  pos,
  style = "block",
  visible = true,
  enableBlink = false,
}: TerminalCursorProps) {
  if (!visible || pos.x < 0 || pos.y < 0) return null;

  const animStyle: React.CSSProperties = enableBlink
    ? { animation: "cursor-blink 1s step-end infinite" }
    : {};

  return (
    <span
      className={`terminal-cursor terminal-cursor--${style}`}
      data-cursor-x={pos.x}
      data-cursor-y={pos.y}
      style={animStyle}
    />
  );
}
