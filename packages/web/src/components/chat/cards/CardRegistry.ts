import type { BaseCardState, ToolCardState, ToolCardType } from "../../../types/cards";

export type CardRenderer<T extends BaseCardState = BaseCardState> = (card: T) => string;

export interface CardRegistry {
  register<T extends BaseCardState>(type: ToolCardType, renderer: CardRenderer<T>): void;
  getRenderer(type: ToolCardType): CardRenderer | undefined;
  hasRenderer(type: ToolCardType): boolean;
  getRegisteredTypes(): ToolCardType[];
  render(card: ToolCardState): string;
}

export function createCardRegistry(): CardRegistry {
  const renderers = new Map<ToolCardType, CardRenderer>();

  function renderFallback(card: ToolCardState): string {
    return `<div class="card-fallback rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
      <span class="card-fallback-type text-neutral-500">[${escapeHtml(card.type)}]</span>
      <span class="card-fallback-title">${escapeHtml(card.title)}</span>
    </div>`;
  }

  return {
    register<T extends BaseCardState>(type: ToolCardType, renderer: CardRenderer<T>): void {
      renderers.set(type, renderer as CardRenderer);
    },

    getRenderer(type: ToolCardType): CardRenderer | undefined {
      return renderers.get(type);
    },

    hasRenderer(type: ToolCardType): boolean {
      return renderers.has(type);
    },

    getRegisteredTypes(): ToolCardType[] {
      return Array.from(renderers.keys());
    },

    render(card: ToolCardState): string {
      const renderer = renderers.get(card.type);
      if (renderer) {
        return renderer(card);
      }
      return renderFallback(card);
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
