import { describe, expect, it } from "vitest";
import {
  createCardRegistry,
  type CardRegistry,
  type CardRenderer,
} from "../../packages/web/src/components/chat/cards/CardRegistry";
import type { BashCard, BaseCardState, GlobCard, ToolCardState } from "../../packages/web/src/types/cards";

function bashRenderer(card: BashCard): string {
  return `<div class="bash-card">${card.content.command}</div>`;
}

function globRenderer(card: GlobCard): string {
  return `<div class="glob-card">${card.content.pattern}</div>`;
}

describe("CardRegistry", () => {
  it("registers a renderer and retrieves it", () => {
    const registry = createCardRegistry();
    registry.register<BashCard>("bash", bashRenderer);
    const found = registry.getRenderer("bash");
    expect(found).toBe(bashRenderer);
  });

  it("returns undefined for unregistered types", () => {
    const registry = createCardRegistry();
    expect(registry.getRenderer("grep")).toBeUndefined();
  });

  it("renders a card using the registered renderer", () => {
    const registry = createCardRegistry();
    registry.register<BashCard>("bash", bashRenderer);
    const card: ToolCardState = {
      id: "c1",
      type: "bash",
      status: "running",
      timestamp: 1,
      title: "test",
      isExpanded: true,
      isCollapsible: true,
      content: { command: "npm", args: ["test"], output: "", exitCode: null, durationMs: null },
    };
    const html = registry.render(card);
    expect(html).toContain("bash-card");
    expect(html).toContain("npm");
  });

  it("returns fallback HTML for unknown card types", () => {
    const registry = createCardRegistry();
    const unknown = {
      id: "u1",
      type: "grep",
      status: "running",
      timestamp: 1,
      title: "unknown",
      isExpanded: true,
      isCollapsible: false,
      content: { pattern: "test", matches: [], totalMatches: 0, filesSearched: 0 },
    } as ToolCardState;
    const html = registry.render(unknown);
    expect(html).toContain("card-fallback");
    expect(html).toContain("grep");
  });

  it("allows overwriting a renderer", () => {
    const registry = createCardRegistry();
    registry.register<BashCard>("bash", bashRenderer);
    const replacement: CardRenderer<BashCard> = (card) => `<span>new</span>`;
    registry.register<BashCard>("bash", replacement);
    const card: ToolCardState = {
      id: "c2",
      type: "bash",
      status: "success",
      timestamp: 1,
      title: "t",
      isExpanded: false,
      isCollapsible: true,
      content: { command: "ls", args: [], output: "", exitCode: 0, durationMs: 10 },
    };
    expect(registry.render(card)).toBe("<span>new</span>");
  });

  it("checks renderer existence via hasRenderer", () => {
    const registry = createCardRegistry();
    expect(registry.hasRenderer("bash")).toBe(false);
    registry.register("bash", bashRenderer);
    expect(registry.hasRenderer("bash")).toBe(true);
  });

  it("lists all registered card types", () => {
    const registry = createCardRegistry();
    registry.register("bash", bashRenderer);
    registry.register("glob", globRenderer);
    const types = registry.getRegisteredTypes();
    expect(types).toContain("bash");
    expect(types).toContain("glob");
    expect(types).toHaveLength(2);
  });
});
