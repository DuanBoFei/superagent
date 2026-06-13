const CJK_BLOCKS: Array<[number, number]> = [
  [0x1100, 0x115f],
  [0x2329, 0x232a],
  [0x2e80, 0x303e],
  [0x3040, 0x33bf],
  [0x3400, 0x4dbf],
  [0x4e00, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7ff],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe1f],
  [0xfe30, 0xfe6f],
  [0xff01, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f000, 0x1f644],
  [0x20000, 0x3ffff],
];

function charWidth(cp: number): number {
  if (cp === 0) return 0;
  if (cp < 0x20) return 0;

  for (const [lo, hi] of CJK_BLOCKS) {
    if (cp >= lo && cp <= hi) return 2;
  }
  return 1;
}

export function stringWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    w += charWidth(ch.codePointAt(0)!);
  }
  return w;
}

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}
