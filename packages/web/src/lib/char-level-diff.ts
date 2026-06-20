import type { CharChange } from "../types/diff";

const DIFF_DELETE = -1;
const DIFF_INSERT = 1;
const DIFF_EQUAL = 0;

type DmpDiff = Array<[number, string]>;

interface DmpInstance {
  diff_main(text1: string, text2: string): DmpDiff;
  diff_cleanupSemantic(diffs: DmpDiff): void;
  DIFF_DELETE: number;
  DIFF_INSERT: number;
  DIFF_EQUAL: number;
}

let dmpCache: DmpInstance | null = null;

async function loadDmp(): Promise<DmpInstance> {
  if (dmpCache) {
    return dmpCache;
  }

  try {
    const mod = await import("diff-match-patch");
    const DmpClass = (mod as Record<string, unknown>).default || mod;
    dmpCache = new (DmpClass as new () => DmpInstance)() as DmpInstance;
  } catch {
    dmpCache = createSimpleDmp();
  }

  return dmpCache;
}

let dmpReady: Promise<DmpInstance> | null = null;

function getDmp(): DmpInstance {
  if (dmpCache) {
    return dmpCache;
  }
  dmpCache = createSimpleDmp();
  // Fire async load for next call
  dmpReady = loadDmp().then((instance) => {
    dmpCache = instance;
    return instance;
  });
  return dmpCache;
}

function createSimpleDmp(): DmpInstance {
  return {
    DIFF_DELETE,
    DIFF_INSERT,
    DIFF_EQUAL,
    diff_main(text1: string, text2: string): DmpDiff {
      return simpleCharDiff(text1, text2);
    },
    diff_cleanupSemantic(_diffs: DmpDiff): void {
      // No-op for simple diff
    },
  };
}

function simpleCharDiff(text1: string, text2: string): DmpDiff {
  const result: DmpDiff = [];

  if (text1 === text2) {
    result.push([DIFF_EQUAL, text1]);
    return result;
  }

  let start = 0;
  while (
    start < text1.length &&
    start < text2.length &&
    text1[start] === text2[start]
  ) {
    start++;
  }

  let end1 = text1.length - 1;
  let end2 = text2.length - 1;
  while (end1 >= start && end2 >= start && text1[end1] === text2[end2]) {
    end1--;
    end2--;
  }

  if (start > 0) {
    result.push([DIFF_EQUAL, text1.slice(0, start)]);
  }

  if (start <= end1) {
    result.push([DIFF_DELETE, text1.slice(start, end1 + 1)]);
  }

  if (start <= end2) {
    result.push([DIFF_INSERT, text2.slice(start, end2 + 1)]);
  }

  if (end1 + 1 < text1.length) {
    result.push([DIFF_EQUAL, text1.slice(end1 + 1)]);
  }

  return result.length > 0 ? result : [[DIFF_EQUAL, text1]];
}

export function computeCharChanges(
  oldText: string,
  newText: string,
): CharChange[] {
  if (!oldText && !newText) {
    return [];
  }

  if (oldText === newText) {
    return [];
  }

  if (!oldText) {
    return [{ start: 0, end: newText.length, type: "add" }];
  }

  if (!newText) {
    return [{ start: 0, end: oldText.length, type: "delete" }];
  }

  try {
    const dmp = getDmp();
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);
    return convertDiffsToCharChanges(diffs);
  } catch {
    return [];
  }
}

function convertDiffsToCharChanges(diffs: DmpDiff): CharChange[] {
  const changes: CharChange[] = [];
  let pos = 0;

  for (const [op, text] of diffs) {
    if (op === DIFF_DELETE) {
      changes.push({
        start: pos,
        end: pos + text.length,
        type: "delete",
      });
    } else if (op === DIFF_INSERT) {
      changes.push({
        start: pos,
        end: pos + text.length,
        type: "add",
      });
      pos += text.length;
    } else {
      pos += text.length;
    }
  }

  return changes;
}
