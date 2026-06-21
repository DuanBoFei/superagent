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
    createdAt: "2026-06-21T10:00:00.000Z",
    updatedAt: "2026-06-21T10:05:00.000Z",
    messageCount: 10,
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

});
