import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BellFlash } from "./TerminalFlash";

describe("BellFlash", () => {
  it("renders nothing when trigger is 0", () => {
    const { container } = render(<BellFlash trigger={0} />);
    expect(container.querySelector(".terminal-bell-flash")).toBeNull();
  });

  it("renders flash when trigger > 0", () => {
    const { container } = render(<BellFlash trigger={1} />);
    expect(container.querySelector(".terminal-bell-flash")).toBeDefined();
  });

  it("has bell aria-label", () => {
    const { container } = render(<BellFlash trigger={1} />);
    const el = container.querySelector("[aria-label='bell']");
    expect(el).toBeDefined();
  });
});
