export const MARKDOWN_NODE_TYPES = [
  "root",
  "paragraph",
  "text",
  "strong",
  "emphasis",
  "delete",
  "heading",
  "blockquote",
  "list",
  "listItem",
  "link",
  "image",
  "inlineCode",
  "codeBlock",
  "table",
  "tableRow",
  "tableCell",
  "thematicBreak",
  "lineBreak",
  "html",
] as const;

export type MarkdownNodeType = (typeof MARKDOWN_NODE_TYPES)[number];

export type MarkdownPartialStructure = "none" | "inCodeBlock" | "inTable" | "inList";

export type MarkdownAlign = "left" | "center" | "right" | null;

export interface BaseMarkdownNode {
  type: MarkdownNodeType;
  children?: MarkdownNode[];
}

export interface RootNode extends BaseMarkdownNode {
  type: "root";
  children: MarkdownNode[];
}

export interface ParagraphNode extends BaseMarkdownNode {
  type: "paragraph";
  children: MarkdownNode[];
}

export interface TextNode extends BaseMarkdownNode {
  type: "text";
  value: string;
}

export interface StrongNode extends BaseMarkdownNode {
  type: "strong";
  children: MarkdownNode[];
}

export interface EmphasisNode extends BaseMarkdownNode {
  type: "emphasis";
  children: MarkdownNode[];
}

export interface DeleteNode extends BaseMarkdownNode {
  type: "delete";
  children: MarkdownNode[];
}

export interface HeadingNode extends BaseMarkdownNode {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: MarkdownNode[];
}

export interface BlockquoteNode extends BaseMarkdownNode {
  type: "blockquote";
  children: MarkdownNode[];
}

export interface ListNode extends BaseMarkdownNode {
  type: "list";
  ordered: boolean;
  start?: number;
  children: ListItemNode[];
}

export interface ListItemNode extends BaseMarkdownNode {
  type: "listItem";
  checked?: boolean;
  children: MarkdownNode[];
}

export interface LinkNode extends BaseMarkdownNode {
  type: "link";
  url: string;
  title?: string;
  children: MarkdownNode[];
}

export interface ImageNode extends BaseMarkdownNode {
  type: "image";
  url: string;
  alt: string;
  title?: string;
}

export interface InlineCodeNode extends BaseMarkdownNode {
  type: "inlineCode";
  value: string;
}

export interface CodeBlockNode extends BaseMarkdownNode {
  type: "codeBlock";
  value: string;
  lang?: string;
  meta?: string;
}

export interface TableNode extends BaseMarkdownNode {
  type: "table";
  align: MarkdownAlign[];
  children: TableRowNode[];
}

export interface TableRowNode extends BaseMarkdownNode {
  type: "tableRow";
  children: TableCellNode[];
}

export interface TableCellNode extends BaseMarkdownNode {
  type: "tableCell";
  align?: MarkdownAlign;
  header: boolean;
  children: MarkdownNode[];
}

export interface ThematicBreakNode extends BaseMarkdownNode {
  type: "thematicBreak";
}

export interface LineBreakNode extends BaseMarkdownNode {
  type: "lineBreak";
}

export interface HtmlNode extends BaseMarkdownNode {
  type: "html";
  value: string;
}

export type MarkdownNode =
  | RootNode
  | ParagraphNode
  | TextNode
  | StrongNode
  | EmphasisNode
  | DeleteNode
  | HeadingNode
  | BlockquoteNode
  | ListNode
  | ListItemNode
  | LinkNode
  | ImageNode
  | InlineCodeNode
  | CodeBlockNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | ThematicBreakNode
  | LineBreakNode
  | HtmlNode;

export interface StreamState {
  rawContent: string;
  ast: MarkdownNode[];
  partialStructure: MarkdownPartialStructure;
}

export interface SanitizeConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedUriSchemes: string[];
  addTargetBlankToLinks: boolean;
  forbidTags: string[];
  forbidAttributes: string[];
}
