import { describe, expect, it } from "vitest";
import { createCardsSlice, type CardsSlice } from "../../packages/web/src/store/slices/cards.slice";
import type { ToolCardState } from "../../packages/web/src/types/cards";

function makeCard(overrides: Partial<ToolCardState> = {}): ToolCardState {
  return {
    id: "card_1",
    type: "bash",
    status: "running",
    timestamp: 1_720_000_000_000,
    title: "npm install",
    isExpanded: true,
    isCollapsible: true,
    content: { command: "npm", args: ["install"], output: "", exitCode: null, durationMs: null },
    ...overrides,
  } as ToolCardState;
}

function fakeStorage(): { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } {
  let data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("cardsSlice", () => {
  it("adds a card and retrieves it", () => {
    const slice = createCardsSlice(fakeStorage());
    const card = makeCard();
    slice.addCard(card);
    const found = slice.getCard("card_1");
    expect(found).toEqual(card);
  });

  it("lists all cards in insertion order", () => {
    const slice = createCardsSlice(fakeStorage());
    slice.addCard(makeCard({ id: "a" }));
    slice.addCard(makeCard({ id: "b" }));
    expect(slice.getAllCards()).toHaveLength(2);
    expect(slice.getAllCards()[0].id).toBe("a");
    expect(slice.getAllCards()[1].id).toBe("b");
  });

  it("updates a card by merging partial data", () => {
    const slice = createCardsSlice(fakeStorage());
    slice.addCard(makeCard());
    slice.updateCard("card_1", { status: "success", title: "done" });
    const updated = slice.getCard("card_1");
    expect(updated?.status).toBe("success");
    expect(updated?.title).toBe("done");
    // Unchanged fields preserved
    expect(updated?.type).toBe("bash");
  });

  it("is a no-op when updating a non-existent card", () => {
    const slice = createCardsSlice(fakeStorage());
    slice.updateCard("missing", { status: "error" });
    expect(slice.getAllCards()).toHaveLength(0);
  });

  it("removes a card", () => {
    const slice = createCardsSlice(fakeStorage());
    slice.addCard(makeCard({ id: "a" }));
    slice.addCard(makeCard({ id: "b" }));
    slice.removeCard("a");
    expect(slice.getCard("a")).toBeUndefined();
    expect(slice.getAllCards()).toHaveLength(1);
    expect(slice.getAllCards()[0].id).toBe("b");
  });

  it("toggles isExpanded and persists to storage", () => {
    const storage = fakeStorage();
    const slice = createCardsSlice(storage);
    slice.addCard(makeCard({ id: "tc", isExpanded: true }));
    slice.toggleExpanded("tc");
    expect(slice.getCard("tc")?.isExpanded).toBe(false);
    // Verify persistence
    const stored = storage.getItem("superagent_card_tc");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.collapsed).toBe(true); // isExpanded=false → collapsed=true
  });

  it("toggles back from collapsed to expanded", () => {
    const storage = fakeStorage();
    const slice = createCardsSlice(storage);
    slice.addCard(makeCard({ id: "tc", isExpanded: false }));
    slice.toggleExpanded("tc");
    expect(slice.getCard("tc")?.isExpanded).toBe(true);
  });

  it("clears all cards", () => {
    const slice = createCardsSlice(fakeStorage());
    slice.addCard(makeCard({ id: "a" }));
    slice.addCard(makeCard({ id: "b" }));
    slice.clearCards();
    expect(slice.getAllCards()).toHaveLength(0);
  });

  it("serializes state for snapshot", () => {
    const slice = createCardsSlice(fakeStorage());
    slice.addCard(makeCard({ id: "snap" }));
    const snap = slice.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].id).toBe("snap");
  });
});
