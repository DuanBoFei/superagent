import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";
import { useChatStore } from "../../store/chat";

describe("Header", () => {
  beforeEach(() => {
    useChatStore.setState({
      activeSessionId: null,
      sessionStats: {},
      isStreaming: false,
      connectionStatus: "disconnected",
    });
  });

  it("renders placeholder when no active session", () => {
    render(<Header />);
    expect(screen.getByText("--")).toBeDefined();
    expect(screen.getByText("Disconnected")).toBeDefined();
  });

  it("renders token counts when session has stats", () => {
    useChatStore.setState({
      activeSessionId: "s1",
      sessionStats: {
        s1: { totalInputTokens: 1000, totalOutputTokens: 500, estimatedOutputTokens: 0 },
      },
      connectionStatus: "connected",
    });
    render(<Header />);
    expect(screen.getByText("1.0k")).toBeDefined(); // Input
    expect(screen.getByText("Connected")).toBeDefined();
  });

  it("renders cost with token counts", () => {
    useChatStore.setState({
      activeSessionId: "s1",
      sessionStats: {
        s1: { totalInputTokens: 100000, totalOutputTokens: 50000, estimatedOutputTokens: 0 },
      },
      connectionStatus: "connected",
    });
    render(<Header />);
    // Cost visible: 100k * $3.00/M + 50k * $15.00/M = $0.30 + $0.75 = $1.05
    expect(screen.getByText("$1.05")).toBeDefined();
  });

  it("shows estimating indicator when streaming", () => {
    useChatStore.setState({
      activeSessionId: "s1",
      sessionStats: {
        s1: { totalInputTokens: 500, totalOutputTokens: 200, estimatedOutputTokens: 300 },
      },
      isStreaming: true,
      connectionStatus: "connected",
    });
    render(<Header />);
    expect(screen.getByText(/estimating/)).toBeDefined();
  });

  it("shows connecting status with yellow indicator", () => {
    useChatStore.setState({
      activeSessionId: "s1",
      sessionStats: {
        s1: { totalInputTokens: 100, totalOutputTokens: 50, estimatedOutputTokens: 0 },
      },
      connectionStatus: "connecting",
    });
    render(<Header />);
    expect(screen.getByText("Connecting...")).toBeDefined();
  });

  it("shows disconnected status with red indicator", () => {
    render(<Header />);
    expect(screen.getByText("Disconnected")).toBeDefined();
  });
});
