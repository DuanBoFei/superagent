import type { ToolCardState } from "../../types/cards";

export interface CardStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CardsSlice {
  addCard(card: ToolCardState): void;
  getCard(id: string): ToolCardState | undefined;
  getAllCards(): ToolCardState[];
  updateCard(id: string, updates: Partial<ToolCardState>): void;
  removeCard(id: string): void;
  toggleExpanded(id: string): void;
  clearCards(): void;
  snapshot(): ToolCardState[];
}

const COLLAPSED_PREFIX = "superagent_card_";

export function createCardsSlice(storage: CardStorageLike): CardsSlice {
  const cards = new Map<string, ToolCardState>();

  function persistCollapsed(id: string, collapsed: boolean): void {
    const key = `${COLLAPSED_PREFIX}${id}`;
    storage.setItem(key, JSON.stringify({ collapsed }));
  }

  return {
    addCard(card: ToolCardState): void {
      cards.set(card.id, { ...card });
    },

    getCard(id: string): ToolCardState | undefined {
      return cards.get(id);
    },

    getAllCards(): ToolCardState[] {
      return Array.from(cards.values());
    },

    updateCard(id: string, updates: Partial<ToolCardState>): void {
      const existing = cards.get(id);
      if (!existing) {
        return;
      }
      cards.set(id, { ...existing, ...updates } as ToolCardState);
    },

    removeCard(id: string): void {
      cards.delete(id);
    },

    toggleExpanded(id: string): void {
      const existing = cards.get(id);
      if (!existing) {
        return;
      }
      const isExpanded = !existing.isExpanded;
      cards.set(id, { ...existing, isExpanded });
      persistCollapsed(id, !isExpanded);
    },

    clearCards(): void {
      cards.clear();
    },

    snapshot(): ToolCardState[] {
      return Array.from(cards.values());
    },
  };
}
