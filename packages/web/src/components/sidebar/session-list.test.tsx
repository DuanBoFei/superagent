import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionList } from "./session-list";
import type { SessionSummary } from "../../types/session-history";

function makeSummary(overrides?: Partial<SessionSummary>): SessionSummary {
  return {
    id: "s1",
    title: "Fix auth bug",
    firstMessagePreview: "Can you help me fix...",
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    durationMs: 60000,
    toolCallCount: 3,
    messageCount: 10,
    status: "completed",
    tags: [],
    forkedFrom: null,
    ...overrides,
  };
}

describe("SessionList", () => {
  it("renders skeleton loading state when loading", () => {
    render(<SessionList sessions={[]} isLoading={true} />);
    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when no sessions", () => {
    render(<SessionList sessions={[]} />);
    expect(screen.getByText("No sessions yet")).toBeDefined();
  });

  it("renders session items", () => {
    render(
      <SessionList
        sessions={[
          makeSummary({ id: "1", title: "Session 1" }),
          makeSummary({ id: "2", title: "Session 2" }),
        ]}
      />,
    );
    expect(screen.getByText("Session 1")).toBeDefined();
    expect(screen.getByText("Session 2")).toBeDefined();
  });

  it("renders sessions in the given order", () => {
    render(
      <SessionList
        sessions={[
          makeSummary({ id: "first", title: "First", updatedAt: 1000 }),
          makeSummary({ id: "third", title: "Third", updatedAt: 3000 }),
          makeSummary({ id: "second", title: "Second", updatedAt: 2000 }),
        ]}
      />,
    );
    const items = document.querySelectorAll("[data-session-id]");
    const ids = Array.from(items).map((el) => el.getAttribute("data-session-id"));
    expect(ids).toEqual(["first", "third", "second"]);
  });

  it("calls onSelect when item clicked", () => {
    const onSelect = vi.fn();
    render(
      <SessionList
        sessions={[makeSummary({ id: "target", title: "Fix auth bug" })]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("Fix auth bug"));
    expect(onSelect).toHaveBeenCalledWith("target", { shift: false, ctrl: false });
  });

  it("calls onDelete when item delete triggered", () => {
    const onDelete = vi.fn();
    render(
      <SessionList
        sessions={[
          makeSummary({ id: "to-delete" }),
          makeSummary({ id: "to-keep" }),
        ]}
        onDelete={onDelete}
      />,
    );
    const deleteBtns = document.querySelectorAll("button[aria-label='Delete session']");
    if (deleteBtns[0]) (deleteBtns[0] as HTMLButtonElement).click();
    expect(onDelete).toHaveBeenCalledWith("to-delete");
  });
});
