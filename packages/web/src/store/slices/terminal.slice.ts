import type { RgbColor, CursorStyle } from "../../types/terminal";
import { createTerminalBuffer } from "../../lib/terminal-buffer";
import type { TerminalBuffer } from "../../lib/terminal-buffer";

export interface TerminalSlice {
  // Buffer management
  createBuffer(id: string, options?: { cols?: number; rows?: number; scrollbackSize?: number }): string;
  destroyBuffer(id: string): void;
  getBuffer(id: string): TerminalBuffer | undefined;

  // Content feeding
  appendToBuffer(id: string, text: string): void;

  // Current buffer tracking
  getCurrentBufferId(): string | null;
  setCurrentBufferId(id: string | null): void;

  // Cursor settings
  getCursorStyle(): CursorStyle;
  setCursorStyle(style: CursorStyle): void;

  // Font settings
  getFontSize(): number;
  setFontSize(size: number): void;

  // Bell
  getEnableBell(): boolean;
  setEnableBell(enabled: boolean): void;

  // Blink
  getEnableBlink(): boolean;
  setEnableBlink(enabled: boolean): void;

  // Alternate screen
  getEnableAlternateScreen(): boolean;
  setEnableAlternateScreen(enabled: boolean): void;

  // Contrast adjustment
  getEnableContrastAdjustment(): boolean;
  setEnableContrastAdjustment(enabled: boolean): void;
}

export function createTerminalSlice(): TerminalSlice {
  const buffers = new Map<string, TerminalBuffer>();
  let currentBufferId: string | null = null;
  let cursorStyle: CursorStyle = "block";
  let fontSize = 13;
  let enableBell = true;
  let enableBlink = false;
  let enableAlternateScreen = true;
  let enableContrastAdjustment = true;

  return {
    createBuffer(id: string, options = {}): string {
      if (buffers.has(id)) return id;
      const buf = createTerminalBuffer(options);
      buffers.set(id, buf);
      if (!currentBufferId) {
        currentBufferId = id;
      }
      return id;
    },

    destroyBuffer(id: string): void {
      buffers.delete(id);
      if (currentBufferId === id) {
        currentBufferId = buffers.size > 0 ? buffers.keys().next().value ?? null : null;
      }
    },

    getBuffer(id: string): TerminalBuffer | undefined {
      return buffers.get(id);
    },

    appendToBuffer(id: string, text: string): void {
      const buf = buffers.get(id);
      if (!buf) return;
      buf.writeText(text);
    },

    getCurrentBufferId(): string | null {
      return currentBufferId;
    },

    setCurrentBufferId(id: string | null): void {
      currentBufferId = id;
    },

    getCursorStyle(): CursorStyle {
      return cursorStyle;
    },

    setCursorStyle(style: CursorStyle): void {
      cursorStyle = style;
    },

    getFontSize(): number {
      return fontSize;
    },

    setFontSize(size: number): void {
      fontSize = size;
    },

    getEnableBell(): boolean {
      return enableBell;
    },

    setEnableBell(enabled: boolean): void {
      enableBell = enabled;
    },

    getEnableBlink(): boolean {
      return enableBlink;
    },

    setEnableBlink(enabled: boolean): void {
      enableBlink = enabled;
    },

    getEnableAlternateScreen(): boolean {
      return enableAlternateScreen;
    },

    setEnableAlternateScreen(enabled: boolean): void {
      enableAlternateScreen = enabled;
    },

    getEnableContrastAdjustment(): boolean {
      return enableContrastAdjustment;
    },

    setEnableContrastAdjustment(enabled: boolean): void {
      enableContrastAdjustment = enabled;
    },
  };
}
