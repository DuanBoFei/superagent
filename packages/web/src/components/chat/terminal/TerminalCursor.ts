export interface CursorPosition {
  x: number;
  y: number;
}

export interface CursorOptions {
  style?: "block" | "underline" | "bar";
  visible?: boolean;
  enableBlink?: boolean;
}

const BLINK_KEYFRAMES = "@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}";

export function renderTerminalCursor(
  pos: CursorPosition,
  options: CursorOptions = {},
): string {
  const { style = "block", visible = true, enableBlink = false } = options;

  if (!visible || pos.x < 0 || pos.y < 0) return "";

  const classNames = ["terminal-cursor", `terminal-cursor--${style}`];
  const animStyle = enableBlink ? "animation:cursor-blink 1s step-end infinite;" : "";

  return `<span class="${classNames.join(" ")}" data-cursor-x="${pos.x}" data-cursor-y="${pos.y}" style="${animStyle}"></span>`;
}

export function renderCursorBlinkStyles(): string {
  return `<style>${BLINK_KEYFRAMES}</style>`;
}
