import { describe, expect, it } from "vitest";
import { createCardRegistry } from "../../packages/web/src/components/chat/cards/CardRegistry";
import { renderCards } from "../../packages/web/src/components/chat/cards/CardRenderer";
import type { BashCard, GlobCard, ToolCardState } from "../../packages/web/src/types/cards";

function bashCard(overrides: Partial<BashCard> = {}): BashCard {
  return {
    id: "bash_1",
    type: "bash",
    status: "success",
    timestamp: 1_720_000_000_000,
    title: "npm install",
    isExpanded: true,
    isCollapsible: true,
    content: { command: "npm", args: ["install"], output: "done", exitCode: 0, durationMs: 1200 },
    ...overrides,
  } as BashCard;
}

function globCard(overrides: Partial<GlobCard> = {}): GlobCard {
  return {
    id: "glob_1",
    type: "glob",
    status: "success",
    timestamp: 1_720_000_000_000,
    title: "Glob: **/*.ts",
    isExpanded: false,
    isCollapsible: true,
    content: { pattern: "**/*.ts", files: ["a.ts", "b.ts"], totalFiles: 2 },
    ...overrides,
  } as GlobCard;
}

describe("renderCards", () => {
  it("renders a vertical stack of cards", () => {
    const registry = createCardRegistry();
    registry.register("bash", (card) => `<div class="bash-card">${card.content.command}</div>`);
    registry.register("glob", (card) => `<div class="glob-card">${card.content.pattern}</div>`);

    const cards: ToolCardState[] = [bashCard(), globCard()];
    const html = renderCards(cards, registry);

    expect(html).toContain("bash-card");
    expect(html).toContain("glob-card");
    // Bash card appears before glob card in output
    expect(html.indexOf("bash-card")).toBeLessThan(html.indexOf("glob-card"));
  });

  it("renders each card with its header", () => {
    const registry = createCardRegistry();
    registry.register("bash", () => `<div>content</div>`);

    const cards: ToolCardState[] = [bashCard({ title: "My Command" })];
    const html = renderCards(cards, registry);

    expect(html).toContain("My Command");
    expect(html).toContain("content");
  });

  it("renders fallback for unregistered card types", () => {
    const registry = createCardRegistry();
    // Don't register anything

    const cards: ToolCardState[] = [bashCard()];
    const html = renderCards(cards, registry);

    expect(html).toContain("card-fallback");
  });

  it("renders an empty string when there are no cards", () => {
    const registry = createCardRegistry();
    const html = renderCards([], registry);
    expect(html).toBe("");
  });

  it("wraps each card in a card container", () => {
    const registry = createCardRegistry();
    registry.register("bash", () => `<div>inner</div>`);

    const cards: ToolCardState[] = [bashCard({ id: "c1" }), bashCard({ id: "c2" })];
    const html = renderCards(cards, registry);

    expect(html).toContain('data-card-id="c1"');
    expect(html).toContain('data-card-id="c2"');
    // Each card in its own container
    const cardContainers = html.split("card-container").length - 1;
    expect(cardContainers).toBe(2);
  });

  it("marks collapsed cards with a collapsed class", () => {
    const registry = createCardRegistry();
    registry.register("bash", () => `<div>content</div>`);

    const cards: ToolCardState[] = [bashCard({ isExpanded: false })];
    const html = renderCards(cards, registry);

    expect(html).toContain("card-collapsed");
  });
});
