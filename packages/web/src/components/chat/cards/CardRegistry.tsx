import React from "react";
import type { ToolCardState, ToolCardType, BashCard, FileReadCard, FileWriteCard, FileEditCard, GrepCard, GlobCard, TaskListCard, SubAgentGridCard, WebSearchCard } from "../../../types/cards";

export type CardComponent<P = unknown> = React.ComponentType<{ card: P; onToggle?: (id: string) => void; onCopy?: (id: string) => void }>;

export interface CardComponentRegistry {
  register(type: ToolCardType, component: CardComponent): void;
  get(type: ToolCardType): CardComponent | undefined;
  has(type: ToolCardType): boolean;
  render(card: ToolCardState, onToggle?: (id: string) => void, onCopy?: (id: string) => void): React.ReactNode;
}

export function createCardComponentRegistry(): CardComponentRegistry {
  const components = new Map<ToolCardType, CardComponent>();

  function renderFallback(card: ToolCardState): React.ReactNode {
    return (
      <div className="card-fallback rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
        <span className="card-fallback-type text-neutral-500">[{card.type}]</span>
        <span className="card-fallback-title">{card.title}</span>
      </div>
    );
  }

  return {
    register(type: ToolCardType, component: CardComponent): void {
      components.set(type, component);
    },

    get(type: ToolCardType): CardComponent | undefined {
      return components.get(type);
    },

    has(type: ToolCardType): boolean {
      return components.has(type);
    },

    render(card: ToolCardState, onToggle?: (id: string) => void, onCopy?: (id: string) => void): React.ReactNode {
      const Component = components.get(card.type);
      if (Component) {
        return React.createElement(Component as React.ComponentType<{ card: unknown; onToggle?: (id: string) => void; onCopy?: (id: string) => void }>, { card, onToggle, onCopy });
      }
      return renderFallback(card);
    },
  };
}
