import { createTerminalSlice } from "../store/slices/terminal.slice";
import type { TerminalSlice } from "../store/slices/terminal.slice";
import type { TerminalBuffer } from "../lib/terminal-buffer";
import type { CursorStyle, TerminalLine } from "../types/terminal";

export interface TerminalBufferHandle {
  id: string;
  slice: TerminalSlice;
  buffer: TerminalBuffer;

  // Feed raw text to the buffer (plain text, not ANSI-escaped).
  // For ANSI content, use TerminalParserHandle instead.
  write(text: string): void;

  // Get current lines
  getLines(): TerminalLine[];

  // Check alternate screen status
  isAlternateScreen(): boolean;

  // Cursor
  getCursor(): { x: number; y: number };
  getCursorVisible(): boolean;

  // Destroy this buffer
  destroy(): void;
}

export function useTerminalBuffer(
  slice: TerminalSlice,
  id: string,
  options?: { cols?: number; rows?: number; scrollbackSize?: number },
): TerminalBufferHandle {
  slice.createBuffer(id, options);
  const buffer = slice.getBuffer(id)!;

  return {
    id,
    slice,
    buffer,

    write(text: string): void {
      slice.appendToBuffer(id, text);
    },

    getLines(): TerminalLine[] {
      return buffer.getLines();
    },

    isAlternateScreen(): boolean {
      return buffer.isAlternateScreen();
    },

    getCursor(): { x: number; y: number } {
      return buffer.getCursor();
    },

    getCursorVisible(): boolean {
      return buffer.getCursorVisible();
    },

    destroy(): void {
      slice.destroyBuffer(id);
    },
  };
}
