import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlternateScreenBanner } from "./AlternateScreenBanner";
import { createDefaultAttributes } from "../../../lib/ansi-parser/sgr";
import type { TerminalLine } from "../../../types/terminal";

function makeLine(chars: string): TerminalLine {
  const attrs = createDefaultAttributes();
  return {
    cells: chars.split("").map((char) => ({ char, attributes: attrs, width: 1 as const })),
    isWrapped: false,
    timestamp: Date.now(),
  };
}

describe("AlternateScreenBanner", () => {
  it("returns null when no saved lines", () => {
    const { container } = render(<AlternateScreenBanner savedLines={[]} />);
    expect(container.querySelector(".alternate-screen-banner")).toBeNull();
  });

  it("renders banner with line count", () => {
    const lines = [makeLine("output line 1"), makeLine("output line 2")];
    render(<AlternateScreenBanner savedLines={lines} />);
    expect(screen.getByText(/2 lines/)).toBeDefined();
  });

  it("shows collapsed state by default", () => {
    const lines = [makeLine("test")];
    const { container } = render(<AlternateScreenBanner savedLines={lines} />);
    const banner = container.querySelector(".alternate-screen-banner");
    expect(banner?.getAttribute("data-collapsed")).toBe("true");
    expect(container.querySelector(".terminal-renderer")).toBeNull();
  });

  it("expands on toggle click", () => {
    const lines = [makeLine("test")];
    const onToggle = vi.fn();
    const { container } = render(<AlternateScreenBanner savedLines={lines} onToggle={onToggle} />);
    fireEvent.click(screen.getByText(/Full-screen application output/));
    const banner = container.querySelector(".alternate-screen-banner");
    expect(banner?.getAttribute("data-collapsed")).toBe("false");
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("shows terminal content when expanded", () => {
    const lines = [makeLine("test")];
    render(<AlternateScreenBanner savedLines={lines} defaultExpanded={true} />);
    expect(document.querySelector(".terminal-renderer")).toBeDefined();
  });

  it("has correct ARIA attributes", () => {
    const lines = [makeLine("test")];
    render(<AlternateScreenBanner savedLines={lines} />);
    const btn = screen.getByRole("button");
    expect(btn?.getAttribute("aria-expanded")).toBe("false");
  });
});
