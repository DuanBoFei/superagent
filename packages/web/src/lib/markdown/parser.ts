import { Lexer, type Token, type Tokens, marked } from "marked";
import type {
  MarkdownAlign,
  MarkdownNode,
  MarkdownPartialStructure,
  TableCellNode,
  TableRowNode,
} from "../../types/markdown";

marked.use({ gfm: true });

export interface PartialParseResult {
  ast: MarkdownNode[];
  partialStructure: MarkdownPartialStructure;
}

export function parseMarkdown(source: string): MarkdownNode[] {
  return tokensToNodes(Lexer.lex(source, { gfm: true }));
}

export function parsePartial(source: string): PartialParseResult {
  return {
    ast: parseMarkdown(closeOpenFence(source)),
    partialStructure: detectPartialStructure(source),
  };
}

export function detectPartialStructure(source: string): MarkdownPartialStructure {
  if (hasOpenFence(source)) {
    return "inCodeBlock";
  }

  const lines = source.split(/\r?\n/);
  const lastNonEmpty = [...lines].reverse().find((line) => line.trim().length > 0) ?? "";

  if (lines.some((line) => isTableLine(line)) && lines.some((line) => isTableDelimiter(line))) {
    return "inTable";
  }

  if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(lastNonEmpty)) {
    return "inList";
  }

  return "none";
}

function tokensToNodes(tokens: Token[] | undefined): MarkdownNode[] {
  return tokens?.flatMap(tokenToNodes) ?? [];
}

function tokenToNodes(token: Token): MarkdownNode[] {
  switch (token.type) {
    case "space":
    case "def":
    case "checkbox":
      return [];
    case "heading":
      return [
        {
          type: "heading",
          depth: normalizeHeadingDepth(token.depth),
          children: tokensToNodes(token.tokens),
        },
      ];
    case "paragraph":
      return [{ type: "paragraph", children: tokensToNodes(token.tokens) }];
    case "text":
      return token.tokens ? tokensToNodes(token.tokens) : [{ type: "text", value: token.text }];
    case "escape":
      return [{ type: "text", value: token.text }];
    case "strong":
      return [{ type: "strong", children: tokensToNodes(token.tokens) }];
    case "em":
      return [{ type: "emphasis", children: tokensToNodes(token.tokens) }];
    case "del":
      return [{ type: "delete", children: tokensToNodes(token.tokens) }];
    case "blockquote":
      return [{ type: "blockquote", children: tokensToNodes(token.tokens) }];
    case "list":
      return [
        {
          type: "list",
          ordered: token.ordered,
          start: token.start === "" ? undefined : token.start,
          children: token.items.map(listItemToNode),
        },
      ];
    case "link":
      return [
        {
          type: "link",
          url: token.href,
          title: token.title ?? undefined,
          children: tokensToNodes(token.tokens),
        },
      ];
    case "image":
      return [
        {
          type: "image",
          url: token.href,
          alt: token.text,
          title: token.title ?? undefined,
        },
      ];
    case "codespan":
      return [{ type: "inlineCode", value: token.text }];
    case "code":
      return [{ type: "codeBlock", value: token.text, lang: token.lang, meta: undefined }];
    case "table":
      return isTableToken(token) ? [tableToNode(token)] : [];
    case "hr":
      return [{ type: "thematicBreak" }];
    case "br":
      return [{ type: "lineBreak" }];
    case "html":
      return [{ type: "html", value: token.text }];
    default:
      return [];
  }
}

function listItemToNode(item: Tokens.ListItem): MarkdownNode & { type: "listItem" } {
  return {
    type: "listItem",
    checked: item.task ? (item.checked ?? false) : undefined,
    children: tokensToNodes(item.tokens),
  };
}

function isTableToken(token: Token): token is Tokens.Table {
  return token.type === "table" && "align" in token && "header" in token && "rows" in token;
}

function tableToNode(token: Tokens.Table): MarkdownNode & { type: "table" } {
  return {
    type: "table",
    align: token.align,
    children: [tableRowToNode(token.header, token.align, true), ...token.rows.map((row) => tableRowToNode(row, token.align, false))],
  };
}

function tableRowToNode(cells: Tokens.TableCell[], align: MarkdownAlign[], header: boolean): TableRowNode {
  return {
    type: "tableRow",
    children: cells.map((cell, index): TableCellNode => ({
      type: "tableCell",
      header,
      align: align[index],
      children: tokensToNodes(cell.tokens),
    })),
  };
}

function normalizeHeadingDepth(depth: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return Math.min(6, Math.max(1, depth)) as 1 | 2 | 3 | 4 | 5 | 6;
}

function hasOpenFence(source: string): boolean {
  const matches = source.match(/^```/gm);
  return (matches?.length ?? 0) % 2 === 1;
}

function closeOpenFence(source: string): string {
  return hasOpenFence(source) ? `${source}\n\`\`\`` : source;
}

function isTableLine(line: string): boolean {
  return line.includes("|");
}

function isTableDelimiter(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
}
