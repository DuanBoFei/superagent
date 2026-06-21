import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionListItem } from "./session-list-item";
import { useSessionHistoryStore } from "../../store/session-history";
import type { SessionSummary } from "../../types/session-history";

function makeSummary(overrides?: Partial<SessionSummary>): SessionSummary {
  return {
    id: "s1",
    title: "Fix auth bug",
    firstMessagePreview: "Can you help me fix the login?",
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    durationMs: 125000,
    toolCallCount: 3,
    messageCount: 10,
    status: "completed",
    tags: [],
    forkedFrom: null,
    ...overrides,
  };
}

beforeEach(() => {
  useSessionHistoryStore.getState().reset();
});

describe("SessionListItem", () => {
  it("renders session title", () => {
    render(<SessionListItem session={makeSummary()} />);
    expect(screen.getByText("Fix auth bug")).toBeDefined();
  });

  it("renders first message preview", () => {
    render(<SessionListItem session={makeSummary()} />);
    expect(screen.getByText("Can you help me fix the login?")).toBeDefined();
  });

  it("renders duration in MM:SS format", () => {
    render(<SessionListItem session={makeSummary({ durationMs: 125000 })} />);
    expect(screen.getByText("02:05")).toBeDefined();
  });

  it("renders tool call count", () => {
    render(<SessionListItem session={makeSummary({ toolCallCount: 3 })} />);
    expect(screen.getByText("3 tools")).toBeDefined();
  });

  it("renders message count", () => {
    render(<SessionListItem session={makeSummary({ messageCount: 10 })} />);
    expect(screen.getByText("10 msg")).toBeDefined();
  });

  it("shows active state when session is active", () => {
    useSessionHistoryStore.getState().selectSession("s1");
    render(<SessionListItem session={makeSummary()} />);
    const item = document.querySelector("[class*='border-l-emerald']");
    expect(item).toBeDefined();
  });

  it("does not show active state for non-active session", () => {
    useSessionHistoryStore.getState().selectSession("other-id");
    render(<SessionListItem session={makeSummary()} />);
    const item = document.querySelector("[class*='border-l-emerald']");
    expect(item).toBeNull();
  });

  it("renders tag chips for tagged sessions", () => {
    render(<SessionListItem session={makeSummary({ tags: ["bug", "frontend"] })} />);
    expect(screen.getByText("bug")).toBeDefined();
    expect(screen.getByText("frontend")).toBeDefined();
  });

  it("renders overflow count when more than 3 tags", () => {
    render(
      <SessionListItem
        session={makeSummary({ tags: ["a", "b", "c", "d", "e"] })}
      />,
    );
    expect(screen.getByText("+2")).toBeDefined();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<SessionListItem session={makeSummary()} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Fix auth bug"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(<SessionListItem session={makeSummary()} onDelete={onDelete} />);
    const deleteBtn = document.querySelector("button[aria-label='Delete session']");
    if (deleteBtn) fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith("s1");
  });

  it("shows fork indicator when session is a fork", () => {
    render(<SessionListItem session={makeSummary({ forkedFrom: "parent-id" })} />);
    const forkIndicator = document.querySelector("[class*='fork']");
    expect(forkIndicator).toBeDefined();
  });
});
