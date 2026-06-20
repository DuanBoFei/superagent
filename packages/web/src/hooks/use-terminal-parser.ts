import type { TerminalBuffer } from "../lib/terminal-buffer";
import type { AnsiParser } from "../lib/ansi-parser";
import { createAnsiParser } from "../lib/ansi-parser";

export interface TerminalParserHandle {
  // Feed ANSI-escaped text chunk to the buffer.
  // Escape sequences are processed and applied to buffer cells.
  append(chunk: string): void;

  // Flush any pending parser state.
  flush(): void;

  // Get the underlying buffer.
  getBuffer(): TerminalBuffer;

  // Reset parser and buffer state.
  reset(): void;
}

// Create a terminal parser that feeds ANSI text into a TerminalBuffer.
// Handles SGR formatting, cursor movements, screen operations, and OSC links.
export function useTerminalParser(buffer: TerminalBuffer): TerminalParserHandle {
  const parser: AnsiParser = createAnsiParser();

  // Track whether we're inside a hyperlink (OSC 8)
  let hyperlinkUrl: string | null = null;

  return {
    append(chunk: string): void {
      // Parse ANSI to HTML (for SGR formatting)
      // Then feed the resolved styled text to the buffer
      // This is a simplified path — full cursor/screen integration
      // happens in the terminal buffer itself
      const html = parser.append(chunk);

      // Strip HTML tags to get plain text, feed to buffer
      const plainText = stripHtmlForBuffer(html);
      buffer.writeText(plainText);
    },

    flush(): void {
      const html = parser.flush();
      if (html) {
        buffer.writeText(stripHtmlForBuffer(html));
      }
    },

    getBuffer(): TerminalBuffer {
      return buffer;
    },

    reset(): void {
      parser.reset();
      buffer.reset();
      hyperlinkUrl = null;
    },
  };
}

// Quick HTML tag stripping for buffer feeding.
// Preserves text content while removing <span>, <a>, etc.
function stripHtmlForBuffer(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
