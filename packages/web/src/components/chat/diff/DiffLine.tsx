import type { DiffLine as DiffLineType } from "../../../types/diff";
import { highlightCode } from "../../../lib/markdown/syntax-highlight";

interface DiffLineOptions {
  language?: string;
  showCharHighlighting?: boolean;
}

const LINE_STYLES: Record<string, { bg: string; text: string; prefix: string }> = {
  add: { bg: "bg-emerald-950/30", text: "text-emerald-300", prefix: "+" },
  delete: { bg: "bg-red-950/30", text: "text-red-300", prefix: "-" },
  modify: { bg: "bg-amber-950/30", text: "text-amber-300", prefix: "~" },
  context: { bg: "", text: "text-neutral-400", prefix: " " },
  empty: { bg: "", text: "text-neutral-600", prefix: "" },
};

function LineNumber({ num }: { num: number | null }) {
  if (num === null) {
    return <span className="diff-line-num w-12 inline-block text-right pr-3 text-neutral-600 select-none"> </span>;
  }
  return <span className="diff-line-num w-12 inline-block text-right pr-3 text-neutral-500 select-none">{num}</span>;
}

function renderHighlightedContent(content: string, language?: string): string {
  if (!language) return content;
  try {
    return highlightCode(content, language);
  } catch {
    return content;
  }
}

export function DiffLine({ line, language, showCharHighlighting }: { line: DiffLineType } & DiffLineOptions) {
  const style = LINE_STYLES[line.type] ?? LINE_STYLES.context;

  const contentHtml =
    showCharHighlighting && line.charChanges.length > 0
      ? renderContentWithCharHighlights(line.content, line.charChanges)
      : renderHighlightedContent(line.content, language);

  return (
    <div className={`diff-line flex items-start font-mono text-xs leading-5 ${style.bg} ${style.text}`} style={{ minHeight: 20 }}>
      <LineNumber num={line.oldLineNumber} />
      <LineNumber num={line.newLineNumber} />
      <span className="diff-line-prefix w-4 inline-block text-neutral-500 select-none">{style.prefix || " "}</span>
      <span className="diff-line-content flex-1 whitespace-pre" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </div>
  );
}

function renderContentWithCharHighlights(
  content: string,
  charChanges: Array<{ start: number; end: number; type: "add" | "delete" }>,
): string {
  const parts: string[] = [];
  let lastEnd = 0;

  for (const change of charChanges) {
    if (change.start > lastEnd) {
      parts.push(escapeHtml(content.slice(lastEnd, change.start)));
    }
    const changedText = escapeHtml(content.slice(change.start, change.end));
    if (change.type === "add") {
      parts.push(`<span class="diff-char-add bg-emerald-600/50 text-emerald-200 rounded-sm">${changedText}</span>`);
    } else {
      parts.push(`<span class="diff-char-del bg-red-600/50 text-red-200 rounded-sm line-through">${changedText}</span>`);
    }
    lastEnd = change.end;
  }

  if (lastEnd < content.length) {
    parts.push(escapeHtml(content.slice(lastEnd)));
  }

  return parts.join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
