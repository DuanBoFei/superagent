import type { ToolCardState } from "../../../types/cards";
import type { CardRegistry } from "./CardRegistry";
import { renderCardHeader } from "./CardHeader";

export function renderCards(cards: ToolCardState[], registry: CardRegistry): string {
  if (cards.length === 0) {
    return "";
  }

  return `<div class="card-stack flex flex-col gap-2">${cards.map((card) => renderOneCard(card, registry)).join("")}</div>`;
}

function renderOneCard(card: ToolCardState, registry: CardRegistry): string {
  const header = renderCardHeader(card);
  const bodyHtml = registry.render(card);
  const collapsedClass = card.isExpanded ? "" : " card-collapsed";

  return `<div class="card-container rounded border border-neutral-800 bg-neutral-950 shadow-sm${collapsedClass}" data-card-id="${escapeAttr(card.id)}" data-card-type="${escapeAttr(card.type)}">
    ${header}
    <div class="card-body px-3 py-2 text-sm text-neutral-200${card.isExpanded ? "" : " hidden"}">
      ${bodyHtml}
    </div>
  </div>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
