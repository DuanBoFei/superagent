const ALLOWED_TAGS = new Set(["a", "b", "br", "code", "em", "i", "li", "ol", "p", "pre", "span", "strong", "ul"]);
const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  code: new Set(["class"]),
  pre: new Set(["class"]),
  span: new Set(["class"]),
};

export function sanitizeHtml(input: string): string {
  let output = input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  output = output.replace(/<\/?([a-z][a-z0-9-]*)(\s[^>]*)?>/gi, (match, rawTag: string, rawAttrs = "") => {
    const closing = match.startsWith("</");
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }
    if (closing) {
      return `</${tag}>`;
    }

    const attrs = sanitizeAttributes(tag, rawAttrs);
    return attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  });
  return output;
}

function sanitizeAttributes(tag: string, rawAttrs: string): string {
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
    if ((name === "href" && !isSafeHref(value)) || /javascript:/i.test(value)) {
      continue;
    }
    attrs.push(`${name}=${JSON.stringify(value)}`);
  }
  return attrs.join(" ");
}

function isSafeHref(value: string): boolean {
  return /^(https?:|mailto:|#|\/)/i.test(value);
}
