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
    case "image":
      return renderImage(node);
    case "table":
      return renderTable(node);
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

function renderImage(node: MarkdownNode & { type: "image" }): string {
  const alt = escapeAttribute(node.alt);
  if (!isSafeUrl(node.url)) {
    return `<span class="markdown-image-fallback" role="img" aria-label="${alt}">${escapeHtml(node.alt)}</span>`;
  }

  const title = node.title ? ` title="${escapeAttribute(node.title)}"` : "";
  return `<span class="markdown-image-frame"><span class="markdown-image-skeleton" aria-hidden="true"></span><img class="markdown-image" src="${escapeAttribute(node.url)}" alt="${alt}"${title} loading="lazy"></span>`;
}

function renderTable(node: MarkdownNode & { type: "table" }): string {
  const headerRows = node.children.filter((row) => row.children.some((cell) => cell.header));
  const bodyRows = node.children.filter((row) => row.children.every((cell) => !cell.header));
  const head = headerRows.length > 0 ? `<thead>${headerRows.map(renderTableRow).join("")}</thead>` : "";
  const body = bodyRows.length > 0 ? `<tbody>${bodyRows.map(renderTableRow).join("")}</tbody>` : "";
  return `<div class="markdown-table-wrapper" role="region" aria-label="Markdown table"><table class="markdown-table">${head}${body}</table></div>`;
}

function renderTableRow(node: MarkdownNode & { type: "tableRow" }): string {
  return `<tr class="markdown-table-row">${node.children.map(renderTableCell).join("")}</tr>`;
}

function renderTableCell(node: MarkdownNode & { type: "tableCell" }): string {
  const tag = node.header ? "th" : "td";
  const headerClass = node.header ? " markdown-table-header" : "";
  const align = node.align ? ` align="${node.align}"` : "";
  return `<${tag} class="markdown-table-cell${headerClass}"${align}>${renderMarkdown(node.children)}</${tag}>`;
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
