export type TerminalColorSpace = "16color" | "256color" | "truecolor";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface TerminalAttributes {
  foreground: RgbColor | null;
  background: RgbColor | null;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  blink: boolean;
  inverse: boolean;
  hidden: boolean;
  strikethrough: boolean;
}

export interface TerminalCell {
  char: string;
  attributes: TerminalAttributes;
  width: 1 | 2;
}

export interface TerminalLine {
  cells: TerminalCell[];
  isWrapped: boolean;
  timestamp: number;
}

export interface TerminalBufferState {
  lines: TerminalLine[];
  cursorX: number;
  cursorY: number;
  cursorVisible: boolean;
  currentAttributes: TerminalAttributes;
  scrollbackSize: number;
  isAlternateScreen: boolean;
}

export type TerminalEventType =
  | "bell"
  | "resize"
  | "alternate-screen-enter"
  | "alternate-screen-exit"
  | "hyperlink-click";

export interface TerminalEvent {
  type: TerminalEventType;
  payload: unknown;
}

export type CursorStyle = "block" | "underline" | "bar";

export interface TerminalRendererProps {
  content: string;
  maxLines?: number;
  fontSize?: number;
  enableBell?: boolean;
  enableBellSound?: boolean;
  enableBlink?: boolean;
  enableAlternateScreen?: boolean;
  enableContrastAdjustment?: boolean;
  virtualScrollThreshold?: number;
}

export interface TerminalLineHeight {
  fontSize: number;
  lineHeight: number;
}
