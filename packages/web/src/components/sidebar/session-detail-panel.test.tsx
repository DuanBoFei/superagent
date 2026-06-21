import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionDetailPanel } from "./session-detail-panel";
import type { Session } from "../../types/session-history";
import type { Message } from "../../types/message";

function makeMessage(overrides?: Partial<Message>): Message {
  return {
    id: "m1",
    role: "user",
    content: "Please fix the auth bug",
    timestamp: 1700000000000,
    status: "sent",
    ...overrides,
  };
}

function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "s1",
    title: "Fix auth bug",
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    durationMs: 125000,
    toolCallCount: 2,
    messageCount: 3,
    status: "completed",
    tags: [],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [
      makeMessage({ id: "m1", role: "user", content: "Fix this" }),
      makeMessage({ id: "m2", role: "assistant", content: "I'll help" }),
    ],
    toolCalls: [],
    ...overrides,
  };
}

describe("SessionDetailPanel", () => {
  it("renders session title", () => {
    render(<SessionDetailPanel session={makeSession()} />);
    expect(screen.getByText("Fix auth bug")).toBeDefined();
  });

  it("renders session status", () => {
    render(<SessionDetailPanel session={makeSession()} />);
    expect(screen.getByText("Completed")).toBeDefined();
  });

  it("renders tool call count and message count", () => {
    render(<SessionDetailPanel session={makeSession()} />);
    expect(screen.getByText("2 tools")).toBeDefined();
    expect(screen.getByText("3 msgs")).toBeDefined();
  });

  it("renders read-only badge", () => {
    render(<SessionDetailPanel session={makeSession()} />);
    expect(screen.getByText("Read-only")).toBeDefined();
  });

  it("renders forked from link when session is a fork", () => {
    render(
      <SessionDetailPanel
        session={makeSession({ forkedFrom: "parent-id" })}
      />,
    );
    expect(screen.getByText("parent session")).toBeDefined();
  });

  it("renders timeline messages", () => {
    render(<SessionDetailPanel session={makeSession()} />);
    expect(screen.getByText("Fix this")).toBeDefined();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<SessionDetailPanel session={makeSession()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close detail panel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onFork when fork button clicked", () => {
    const onFork = vi.fn();
    render(<SessionDetailPanel session={makeSession()} onFork={onFork} />);
    const forkButtons = screen.getAllByText("Fork");
    if (forkButtons[0]) fireEvent.click(forkButtons[0]);
    expect(onFork).toHaveBeenCalled();
  });

  it("shows empty state when no messages", () => {
    render(
      <SessionDetailPanel
        session={makeSession({ messages: [], toolCalls: [] })}
      />,
    );
    expect(screen.getByText("No messages in this session")).toBeDefined();
  });

  it("shows load more button when exceeding maxEntries", () => {
    const messages = Array.from({ length: 55 }, (_, i) =>
      makeMessage({ id: `m${i}`, content: `msg ${i}` }),
    );
    render(
      <SessionDetailPanel
        session={makeSession({ messages, messageCount: 55 })}
        maxEntries={50}
      />,
    );
    expect(screen.getByText(/load more/i)).toBeDefined();
  });

  it("renders tags as clickable chips", () => {
    const onTagClick = vi.fn();
    render(
      <SessionDetailPanel
        session={makeSession({ tags: ["bug"] })}
        onTagClick={onTagClick}
      />,
    );
    fireEvent.click(screen.getByText("bug"));
    expect(onTagClick).toHaveBeenCalledWith("bug");
  });
});
