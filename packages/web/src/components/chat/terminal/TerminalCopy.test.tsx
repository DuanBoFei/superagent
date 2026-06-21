import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CopyButton, stripAnsiForCopy, escapeForDataAttr } from "./TerminalCopy";

describe("CopyButton", () => {
  it("renders copy button", () => {
    render(<CopyButton rawContent="test content" />);
    expect(screen.getByText("Copy")).toBeDefined();
  });

  it("has aria-label", () => {
    render(<CopyButton rawContent="test content" />);
    const btn = screen.getByRole("button", { name: "Copy terminal output" });
    expect(btn).toBeDefined();
  });

  it("calls onCopy with raw content when clicked", () => {
    const onCopy = vi.fn();
    render(<CopyButton rawContent="ansi content" onCopy={onCopy} />);
    fireEvent.click(screen.getByText("Copy"));
    expect(onCopy).toHaveBeenCalledWith("ansi content");
  });
});

describe("stripAnsiForCopy", () => {
  it("removes ANSI escape sequences", () => {
    const input = "\x1b[31mRed text\x1b[0m normal";
    expect(stripAnsiForCopy(input)).toBe("Red text normal");
  });

  it("removes BEL characters", () => {
    expect(stripAnsiForCopy("hello\x07world")).toBe("helloworld");
  });
});

describe("escapeForDataAttr", () => {
  it("escapes HTML entities", () => {
    expect(escapeForDataAttr('hello"world')).toContain("&quot;");
  });

  it("escapes newlines", () => {
    expect(escapeForDataAttr("a\nb")).toContain("&#10;");
  });
});
