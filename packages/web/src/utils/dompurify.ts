const ALLOWED_TAGS = new Set(["a", "b", "br", "code", "em", "i", "li", "ol", "p", "pre", "span", "strong", "ul"]);
const MARKDOWN_ALLOWED_TAGS = new Set([
  ...ALLOWED_TAGS,
  "blockquote",
  "del",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "ins",
  "mark",
  "small",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
]);
const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  code: new Set(["class"]),
  img: new Set(["alt", "src", "title"]),
  pre: new Set(["class"]),
  span: new Set(["class"]),
  td: new Set(["align"]),
  th: new Set(["align"]),
};

export function sanitizeHtml(input: string): string {
  return sanitizeWithAllowedTags(input, ALLOWED_TAGS, false);
}

export function sanitizeMarkdown(input: string): string {
  return sanitizeWithAllowedTags(input, MARKDOWN_ALLOWED_TAGS, true);
}

function sanitizeWithAllowedTags(input: string, allowedTags: Set<string>, addLinkSecurityAttrs: boolean): string {
  let output = input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  output = output.replace(/<\/?([a-z][a-z0-9-]*)(\s[^>]*)?>/gi, (match, rawTag: string, rawAttrs = "") => {
    const closing = match.startsWith("</");
    const tag = rawTag.toLowerCase();
    if (!allowedTags.has(tag)) {
      return "";
    }
    if (closing) {
      return `</${tag}>`;
    }

    const attrs = sanitizeAttributes(tag, rawAttrs, addLinkSecurityAttrs);
    return attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  });
  return output;
}

function sanitizeAttributes(tag: string, rawAttrs: string, addLinkSecurityAttrs: boolean): string {
  const safeAttrs = SAFE_ATTRS[tag];
  if (!safeAttrs) {
    return "";
  }

  const attrs: string[] = [];
  for (const match of rawAttrs.matchAll(/\s([a-zA-Z:-]+)=("[^"]*"|'[^']*')/g)) {
    const name = match[1]?.toLowerCase();
    const quotedValue = match[2];
    if (!name || !quotedValue || !safeAttrs.has(name)) {
      continue;
    }
    const value = quotedValue.slice(1, -1);
    if (((name === "href" || name === "src") && !isSafeUrl(value)) || /javascript:/i.test(value)) {
      continue;
    }
    attrs.push(`${name}=${JSON.stringify(value)}`);
  }
  if (tag === "a" && addLinkSecurityAttrs) {
    attrs.push('target="_blank"', 'rel="noopener noreferrer"');
  }
  return attrs.join(" ");
}

function isSafeUrl(value: string): boolean {
  return /^(https?:|mailto:|#|\/|[^:]+$)/i.test(value);
}
