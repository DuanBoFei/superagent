import { describe, expect, it } from "vitest";
import { renderErrorCard, type ErrorCardState } from "../../packages/web/src/components/chat/cards/ErrorCard";

function card(overrides: Partial<ErrorCardState> = {}): ErrorCardState {
  return {
    id: "err1", status: "error", timestamp: 1_720_000_000_000,
    title: "Error: Connection refused", isExpanded: true,
    content: {
      errorType: "ConnectError",
      message: "Connection refused to localhost:8080",
      stackTrace: "Error: connect ECONNREFUSED\n    at Socket.<anonymous> (net.js:123)\n    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:456)",
    },
    ...overrides,
  };
}

describe("renderErrorCard", () => {
  it("displays error type and message", () => {
    const html = renderErrorCard(card());
    expect(html).toContain("ConnectError");
    expect(html).toContain("Connection refused to localhost:8080");
  });

  it("shows stack trace when expanded", () => {
    const html = renderErrorCard(card({ isExpanded: true }));
    expect(html).toContain("ECONNREFUSED");
  });

  it("hides stack trace when collapsed", () => {
    const html = renderErrorCard(card({ isExpanded: false }));
    expect(html).toContain("Show stack trace");
    expect(html).toContain("hidden");
  });

  it("includes copy button", () => {
    const html = renderErrorCard(card());
    expect(html).toContain("Copy error details");
  });

  it("does not show stack toggle when no stack trace", () => {
    const html = renderErrorCard(card({
      content: { errorType: "SimpleError", message: "Something went wrong" },
    }));
    expect(html).not.toContain("stack trace");
  });
});
