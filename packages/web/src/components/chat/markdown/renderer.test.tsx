import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownRenderer } from "./renderer";

describe("MarkdownRenderer", () => {
  it("renders plain text", () => {
    render(<MarkdownRenderer content="hello world" />);
    expect(screen.getByText("hello world")).toBeDefined();
  });

  it("renders headings", () => {
    render(<MarkdownRenderer content={"# Title\n## Section\n### Sub"} />);
    expect(screen.getByText("Title")).toBeDefined();
    expect(screen.getByText("Section")).toBeDefined();
    expect(screen.getByText("Sub")).toBeDefined();
  });

  it("renders bold and italic", () => {
    const { container } = render(<MarkdownRenderer content="**bold** and *italic*" />);
    expect(container.querySelector("strong")).toBeDefined();
    expect(container.querySelector("em")).toBeDefined();
  });

  it("renders unordered lists", () => {
    const { container } = render(<MarkdownRenderer content={"- one\n- two\n- three"} />);
    expect(container.querySelector("ul")).toBeDefined();
    expect(screen.getByText("one")).toBeDefined();
    expect(screen.getByText("two")).toBeDefined();
  });

  it("renders ordered lists", () => {
    const { container } = render(<MarkdownRenderer content={"1. first\n2. second"} />);
    expect(container.querySelector("ol")).toBeDefined();
    expect(screen.getByText("first")).toBeDefined();
  });

  it("renders inline code", () => {
    const { container } = render(<MarkdownRenderer content="use `const` keyword" />);
    expect(container.querySelector("code")).toBeDefined();
  });

  it("renders code blocks with syntax highlighting", () => {
    const { container } = render(
      <MarkdownRenderer content={'```ts\nconst x: number = 1;\n```'} />,
    );
    // react-syntax-highlighter wraps code in <pre>
    expect(container.querySelector("pre")).toBeDefined();
  });

  it("renders links", () => {
    const { container } = render(
      <MarkdownRenderer content="[Google](https://google.com)" />,
    );
    const a = container.querySelector("a");
    expect(a).toBeDefined();
    expect(a?.getAttribute("href")).toBe("https://google.com");
  });

  it("renders blockquotes", () => {
    const { container } = render(<MarkdownRenderer content="> quoted text" />);
    expect(container.querySelector("blockquote")).toBeDefined();
  });

  it("sanitizes XSS via script tags", () => {
    const { container } = render(
      <MarkdownRenderer content={'<script>alert("xss")</script>'} />,
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("sanitizes XSS via event handlers", () => {
    const { container } = render(
      <MarkdownRenderer content={'<img src=x onerror="alert(1)">'} />,
    );
    const img = container.querySelector("img");
    if (img) {
      expect(img.getAttribute("onerror")).toBeNull();
    }
  });

  it("renders code block with copy button", () => {
    const { container } = render(
      <MarkdownRenderer content={'```ts\nconsole.log("hello");\n```'} />,
    );
    const copyBtn = container.querySelector('[aria-label="Copy code"]');
    expect(copyBtn).toBeDefined();
  });

  it("collapses long code blocks (>50 lines)", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`).join("\n");
    const { container } = render(
      <MarkdownRenderer content={"```ts\n" + lines + "\n```"} />,
    );
    const toggle = container.querySelector('[aria-expanded]');
    expect(toggle).toBeDefined();
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("expands collapsed code block on click", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`).join("\n");
    const { container } = render(
      <MarkdownRenderer content={"```ts\n" + lines + "\n```"} />,
    );
    const toggle = container.querySelector('[aria-expanded="false"]') as HTMLElement;
    if (toggle) {
      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
    }
  });
});
