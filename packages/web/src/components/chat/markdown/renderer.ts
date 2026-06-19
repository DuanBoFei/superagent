import type { MarkdownNode } from "../../../types/markdown";

export function renderMarkdown(nodes: MarkdownNode[]): string {
  return nodes.map(renderNode).join("");
}

function renderNode(node: MarkdownNode): string {
  switch (node.type) {
    case "root":
      return renderMarkdown(node.children);
    case "paragraph":
      return `<p class="markdown-paragraph">${renderMarkdown(node.children)}</p>`;
    case "text":
      return escapeHtml(node.value);
    case "strong":
      return `<strong>${renderMarkdown(node.children)}</strong>`;
    case "emphasis":
      return `<em>${renderMarkdown(node.children)}</em>`;
    case "delete":
      return `<del>${renderMarkdown(node.children)}</del>`;
    case "heading":
      return `<h${node.depth} class="markdown-heading markdown-heading-${node.depth}">${renderMarkdown(node.children)}</h${node.depth}>`;
    case "blockquote":
      return `<blockquote class="markdown-blockquote">${renderMarkdown(node.children)}</blockquote>`;
    case "list":
      return renderList(node);
    case "listItem":
      return renderListItem(node);
    case "link":
      return renderLink(node);
    case "inlineCode":
      return `<code class="markdown-inline-code">${escapeHtml(node.value)}</code>`;
    case "thematicBreak":
      return '<hr class="markdown-rule">';
    case "lineBreak":
      return "<br>";
    case "html":
      return escapeHtml(node.value);
    default:
      return "";
  }
}

function renderList(node: MarkdownNode & { type: "list" }): string {
  const tag = node.ordered ? "ol" : "ul";
  const kind = node.ordered ? "ordered" : "unordered";
  const start = node.ordered && node.start ? ` start="${node.start}"` : "";
  return `<${tag} class="markdown-list markdown-list-${kind}"${start}>${node.children.map(renderListItem).join("")}</${tag}>`;
}

function renderListItem(node: MarkdownNode & { type: "listItem" }): string {
  const checkbox = renderTaskCheckbox(node.checked);
  return `<li class="markdown-list-item">${checkbox}${renderMarkdown(node.children)}</li>`;
}

function renderLink(node: MarkdownNode & { type: "link" }): string {
  const href = isSafeUrl(node.url) ? ` href="${escapeAttribute(node.url)}"` : "";
  const title = node.title ? ` title="${escapeAttribute(node.title)}"` : "";
  return `<a class="markdown-link"${href}${title} target="_blank" rel="noopener noreferrer">${renderMarkdown(node.children)}</a>`;
}

function renderTaskCheckbox(checked: boolean | undefined): string {
  if (checked === undefined) {
    return "";
  }
  return checked
    ? '<input type="checkbox" checked disabled aria-label="Completed task">'
    : '<input type="checkbox" disabled aria-label="Incomplete task">';
}

function isSafeUrl(value: string): boolean {
  return /^(https?:|mailto:|#|\/)/i.test(value);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
