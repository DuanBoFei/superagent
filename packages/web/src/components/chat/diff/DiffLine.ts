import type { DiffLine as DiffLineType } from "../../../types/diff";
import { highlightCode } from "../../../lib/markdown/syntax-highlight";
import { computeCharChanges } from "../../../lib/char-level-diff";

interface DiffLineOptions {
  language?: string;
  showCharHighlighting?: boolean;
}

const LINE_STYLES: Record<string, { bg: string; text: string; prefix: string }> = {
  add: {
    bg: "bg-emerald-950/30",
    text: "text-emerald-300",
    prefix: "+",
  },
  delete: {
    bg: "bg-red-950/30",
    text: "text-red-300",
    prefix: "-",
  },
  modify: {
    bg: "bg-amber-950/30",
    text: "text-amber-300",
    prefix: "~",
  },
  context: {
    bg: "",
    text: "text-neutral-400",
    prefix: " ",
  },
  empty: {
    bg: "",
    text: "text-neutral-600",
    prefix: "",
  },
};

function renderLineNumber(num: number | null): string {
  if (num === null) {
    return `<span class="diff-line-num w-12 inline-block text-right pr-3 text-neutral-600 select-none"> </span>`;
  }
  return `<span class="diff-line-num w-12 inline-block text-right pr-3 text-neutral-500 select-none">${num}</span>`;
}

function renderContentWithHighlights(
  content: string,
  charChanges: Array<{ start: number; end: number; type: "add" | "delete" }>,
  language?: string,
): string {
  if (charChanges.length === 0) {
    return escapeHtml(content);
  }

  const parts: string[] = [];
  let lastEnd = 0;

  for (const change of charChanges) {
    if (change.start > lastEnd) {
      parts.push(escapeHtml(content.slice(lastEnd, change.start)));
    }

    const changedText = escapeHtml(content.slice(change.start, change.end));
    if (change.type === "add") {
      parts.push(
        `<span class="diff-char-add bg-emerald-600/50 text-emerald-200 rounded-sm">${changedText}</span>`,
      );
    } else {
      parts.push(
        `<span class="diff-char-del bg-red-600/50 text-red-200 rounded-sm line-through">${changedText}</span>`,
      );
    }

    lastEnd = change.end;
  }

  if (lastEnd < content.length) {
    parts.push(escapeHtml(content.slice(lastEnd)));
  }

  return parts.join("");
}

function renderWithHighlighting(
  content: string,
  language?: string,
): string {
  if (language) {
    try {
      return highlightCode(content, language);
    } catch {
      return escapeHtml(content);
    }
  }
  return escapeHtml(content);
}

export function renderDiffLine(
  line: DiffLineType,
  options: DiffLineOptions = {},
): string {
  const style = LINE_STYLES[line.type] ?? LINE_STYLES.context;
  const oldNum = renderLineNumber(line.oldLineNumber);
  const newNum = renderLineNumber(line.newLineNumber);

  let contentHtml: string;

  if (options.showCharHighlighting && line.charChanges.length > 0) {
    contentHtml = renderContentWithHighlights(
      line.content,
      line.charChanges,
      options.language,
    );
  } else if (line.type === "context" || line.type === "add" || line.type === "delete") {
    contentHtml = renderWithHighlighting(line.content, options.language);
  } else {
    contentHtml = renderWithHighlighting(line.content, options.language);
  }

  const prefixSpan = style.prefix
    ? `<span class="diff-line-prefix w-4 inline-block text-neutral-500 select-none">${style.prefix}</span>`
    : `<span class="diff-line-prefix w-4 inline-block select-none"> </span>`;

  return `<div class="diff-line flex items-start font-mono text-xs leading-5 ${style.bg} ${style.text} min-h-[20px]">
    ${oldNum}${newNum}${prefixSpan}<span class="diff-line-content flex-1 whitespace-pre">${contentHtml}</span>
  </div>`;
}

export function renderDiffLineCompact(
  line: DiffLineType,
  options: DiffLineOptions = {},
): string {
  const style = LINE_STYLES[line.type] ?? LINE_STYLES.context;

  let contentHtml = renderWithHighlighting(line.content, options.language);

  return `<span class="diff-line-compact ${style.bg} ${style.text}">${style.prefix}${contentHtml}</span>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
