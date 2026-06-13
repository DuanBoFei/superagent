import type { TerminalConfig } from "./types";
import { stringWidth } from "./wcwidth";

export function renderText(content: string, config: TerminalConfig): void {
  let col = 0;
  let word = "";

  for (const ch of content) {
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
  const wordW = stringWidth(word);

  if (col > 0 && col + 1 + wordW > width) {
    process.stdout.write("\n  ");
    col = 2;
  }

  let remaining = word;
  while (remaining.length > 0) {
    const available = width - col;
    if (available <= 0) {
      process.stdout.write("\n  ");
      col = 2;
    }
    const maxCols = col === 2 ? width - 2 : width - col;
    const { slice, width: used } = takeFit(remaining, maxCols);
    process.stdout.write(slice);
    remaining = remaining.slice(slice.length);
    col += used;
  }
}

function takeFit(
  s: string,
  maxCols: number,
): { slice: string; width: number } {
  let w = 0;
  let i = 0;
  for (const ch of s) {
    const cw = stringWidth(ch);
    if (w + cw > maxCols) break;
    w += cw;
    i += ch.length;
  }
  if (i === 0) {
    const ch = [...s][0]!;
    return { slice: ch, width: stringWidth(ch) };
  }
  return { slice: s.slice(0, i), width: w };
}
