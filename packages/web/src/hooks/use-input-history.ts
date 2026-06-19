export interface InputHistory {
  addHistoryItem(text: string): void;
  navigateUp(): string;
  navigateDown(): string;
  getItems(): string[];
}

const MAX_HISTORY = 50;

export function createInputHistory(): InputHistory {
  let items: string[] = [];
  let cursor = 0;

  return {
    addHistoryItem: (text) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      items = [...items, trimmed].slice(-MAX_HISTORY);
      cursor = items.length;
    },
    navigateUp: () => {
      if (items.length === 0) {
        return "";
      }
      cursor = Math.max(0, cursor - 1);
      return items[cursor];
    },
    navigateDown: () => {
      if (items.length === 0) {
        return "";
      }
      cursor = Math.min(items.length, cursor + 1);
      return cursor === items.length ? "" : items[cursor];
    },
    getItems: () => [...items],
  };
}

export function useInputHistory(): InputHistory {
  return createInputHistory();
}
