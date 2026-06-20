import { describe, expect, it } from "vitest";
import { renderSubAgentGridCard } from "../../packages/web/src/components/chat/cards/SubAgentGridCard";
import type { SubAgentGridCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<SubAgentGridCard> = {}): SubAgentGridCard {
  return {
    id: "s1", type: "sub-agent-grid", status: "success", timestamp: 1_720_000_000_000,
    title: "Sub-agents", isExpanded: true, isCollapsible: false,
    content: {
      cells: [
        { agentId: "a1", title: "Explore src/", status: "success", output: "Found 12 files", progress: 100 },
        { agentId: "a2", title: "Lint check", status: "running", output: "Checking...", progress: 45 },
      ],
      columns: 2,
    },
    ...overrides,
  } as SubAgentGridCard;
}

describe("renderSubAgentGridCard", () => {
  it("renders 2-column grid layout", () => {
    const html = renderSubAgentGridCard(card());
    expect(html).toContain("grid-cols-2");
  });

  it("displays cell titles", () => {
    const html = renderSubAgentGridCard(card());
    expect(html).toContain("Explore src/");
    expect(html).toContain("Lint check");
  });

  it("shows cell output text", () => {
    const html = renderSubAgentGridCard(card());
    expect(html).toContain("Found 12 files");
    expect(html).toContain("Checking...");
  });

  it("supports 1-column layout", () => {
    const single = card({
      content: {
        cells: [{ agentId: "a1", title: "Solo", status: "running", output: "", progress: 30 }],
        columns: 1,
      },
    });
    const html = renderSubAgentGridCard(single);
    expect(html).toContain("grid-cols-1");
  });
});
