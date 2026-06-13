const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function renderDiff(
  oldContent: string,
  newContent: string,
  filePath: string,
): void {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const diffLines = computeDiff(oldLines, newLines);

  const totalLines = diffLines.length;
  const truncate = totalLines > 200;

  const displayLines = truncate
    ? [
        ...diffLines.slice(0, 100),
        {
          type: "context" as const,
          content: `...${totalLines - 200} lines unchanged...`,
        },
        ...diffLines.slice(-100),
      ]
    : diffLines;

  process.stdout.write(`\n--- ${filePath}\n`);
  process.stdout.write(`+++ ${filePath}\n`);

  for (const line of displayLines) {
    const sanitized = sanitize(line.content);
    switch (line.type) {
      case "added":
        process.stdout.write(`${GREEN}+ ${sanitized}${RESET}\n`);
        break;
      case "removed":
        process.stdout.write(`${RED}- ${sanitized}${RESET}\n`);
        break;
      case "context":
        process.stdout.write(`${DIM}  ${sanitized}${RESET}\n`);
        break;
    }
  }
}

interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const lcs = buildLcsMatrix(oldLines, newLines);
  const edits = backtrack(lcs, oldLines, newLines, oldLines.length, newLines.length);
  result.push(...edits);
  return result;
}

function buildLcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  return dp;
}

function backtrack(
  dp: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number,
): DiffLine[] {
  const result: DiffLine[] = [];

  if (i === 0 && j === 0) return result;
  if (i === 0) {
    for (let k = 0; k < j; k++) {
      result.push({ type: "added", content: b[k]! });
    }
    return result;
  }
  if (j === 0) {
    for (let k = 0; k < i; k++) {
      result.push({ type: "removed", content: a[k]! });
    }
    return result;
  }

  if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
    const prev = backtrack(dp, a, b, i - 1, j - 1);
    result.push(...prev);
    result.push({ type: "context", content: a[i - 1]! });
  } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
    const prev = backtrack(dp, a, b, i, j - 1);
    result.push(...prev);
    result.push({ type: "added", content: b[j - 1]! });
  } else if (i > 0) {
    const prev = backtrack(dp, a, b, i - 1, j);
    result.push(...prev);
    result.push({ type: "removed", content: a[i - 1]! });
  }

  return result;
}

function sanitize(content: string): string {
  return content.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ".");
}
