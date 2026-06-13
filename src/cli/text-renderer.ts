import type { TerminalConfig } from "./types";

export function renderText(content: string, config: TerminalConfig): void {
  let col = 0;
  let word = "";

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;

    if (ch === "\n") {
      flushWord(word, col, config);
      process.stdout.write("\n");
      col = 0;
      word = "";
      continue;
    }

    if (ch === " ") {
      flushWord(word, col, config);
      if (col > 0) {
        process.stdout.write(" ");
        col++;
      }
      word = "";
      continue;
    }

    word += ch;
  }

  flushWord(word, col, config);
}

function flushWord(
  word: string,
  col: number,
  config: TerminalConfig,
): void {
  if (word.length === 0) return;

  const width = config.width > 0 ? config.width : 80;

  if (col > 0 && col + 1 + word.length > width) {
    process.stdout.write("\n  ");
    col = 2;
  }

  // Split long words that exceed terminal width
  let remaining = word;
  while (remaining.length > 0) {
    const available = width - col;
    if (available <= 0) {
      process.stdout.write("\n  ");
      col = 2;
    }
    const chunkLen = Math.min(remaining.length, col === 2 ? width - 2 : width - col);
    const chunk = remaining.slice(0, chunkLen);
    process.stdout.write(chunk);
    remaining = remaining.slice(chunkLen);
    col += chunk.length;
  }
}
