"use client";

import { useMemo, useState, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import ts from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import go from "react-syntax-highlighter/dist/esm/languages/hljs/go";
import rust from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css";
import nightOwl from "react-syntax-highlighter/dist/esm/styles/hljs/night-owl";

SyntaxHighlighter.registerLanguage("ts", ts);
SyntaxHighlighter.registerLanguage("typescript", ts);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("jsx", javascript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("css", css);

const COLLAPSE_THRESHOLD = 50;

function CodeBlock({ language, code }: { language: string; code: string }) {
  const lines = code.split("\n");
  const isLong = lines.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  const displayCode = isLong && !expanded
    ? lines.slice(0, 10).join("\n") + "\n// ... (truncated)"
    : code;

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-header">
        <span>{language || "text"}</span>
        <button type="button" aria-label="Copy code" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={nightOwl}
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {displayCode}
      </SyntaxHighlighter>
      {isLong && (
        <button
          type="button"
          className="markdown-code-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? "Collapse" : `Expand ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "em", "del",
  "ul", "ol", "li",
  "a", "blockquote",
  "code", "pre",
  "table", "thead", "tbody", "tr", "th", "td",
  "img", "span", "div",
  "input",
];

const ALLOWED_ATTR = [
  "href", "title", "target", "rel",
  "src", "alt", "width", "height",
  "class", "id",
  "type", "checked", "disabled",
  "aria-label", "aria-hidden", "role",
  "align", "start",
  "loading",
];

function sanitize(html: string): string {
  return DOMPurify(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

export function MarkdownRenderer({ content }: { content: string }) {
  const elements = useMemo(() => {
    const tokens = marked.lexer(content);
    const result: React.ReactNode[] = [];
    let buffer = "";

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === "code") {
        if (buffer) {
          result.push(
            <div
              key={`md-${result.length}`}
              dangerouslySetInnerHTML={{ __html: sanitize(marked.parse(buffer)) }}
            />,
          );
          buffer = "";
        }
        const codeToken = token as marked.Tokens.Code;
        result.push(
          <CodeBlock
            key={`cb-${result.length}`}
            language={codeToken.lang || "text"}
            code={codeToken.text}
          />,
        );
      } else if (token.type !== "space") {
        buffer += (token as { raw?: string }).raw ?? "";
      }
    }

    if (buffer) {
      result.push(
        <div
          key={`md-${result.length}`}
          dangerouslySetInnerHTML={{ __html: sanitize(marked.parse(buffer)) }}
        />,
      );
    }

    return result;
  }, [content]);

  return <div className="markdown-renderer">{elements}</div>;
}
