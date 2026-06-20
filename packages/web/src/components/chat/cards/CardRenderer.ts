import type { SortField, SortOrder, StatusFilter, ViewMode } from "../../../types/tool-grid";
import { calculateColumns } from "../../../types/tool-grid";
import type { ToolCardState } from "../../../types/cards";
import type { CardRegistry } from "./CardRegistry";
import { renderCardHeader } from "./CardHeader";
import { renderBulkActionBar } from "../tool-grid/BulkActionBar";
import { renderSortFilterControls } from "../tool-grid/SortFilterControls";
import { renderViewToggle } from "../tool-grid/ViewToggle";

export interface GridOptions {
  containerWidth?: number;
  viewMode?: ViewMode;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  filterStatus?: StatusFilter;
}

export function renderCards(cards: ToolCardState[], registry: CardRegistry): string {
  if (cards.length === 0) {
    return "";
  }

  return `<div class="card-stack flex flex-col gap-2">${cards.map((card) => renderOneCard(card, registry)).join("")}</div>`;
}

export function renderCardsGrid(cards: ToolCardState[], registry: CardRegistry, opts: GridOptions = {}): string {
  if (cards.length === 0) return "";

  // Single tool → backward compat via renderCards
  if (cards.length === 1) {
    return renderCards(cards, registry);
  }

  const {
    containerWidth = 1024,
    viewMode = "grid",
    sortBy = "status",
    sortOrder = "asc",
    filterStatus = "all",
  } = opts;

  const runningCount = cards.filter((c) => c.status === "running" || c.status === "pending").length;
  const completedCount = cards.filter((c) => c.status === "success" || c.status === "error").length;
  const errorCards = cards.filter((c) => c.status === "error");
  const columns = calculateColumns(cards.length, viewMode, containerWidth);

  const errorBanner = renderErrorBanner(errorCards);
  const bulkBar = renderBulkActionBar({ runningCount, completedCount, showUndo: false });
  const sortFilter = renderSortFilterControls({ sortBy, sortOrder, filterStatus });
  const viewToggle = renderViewToggle(viewMode);

  const cardsHtml = cards.map((card) => renderOneCard(card, registry)).join("");

  let cardsSection: string;
  if (cards.length > 20) {
    const TOOL_CARD_HEIGHT = 136;
    const totalHeight = cards.length * TOOL_CARD_HEIGHT;
    cardsSection = `<div class="virtual-scroll-container" style="height:${totalHeight}px"><div class="virtual-scroll-inner">${cardsHtml}</div></div>`;
  } else {
    cardsSection = cardsHtml;
  }

  return `<div class="tool-grid view-mode-${viewMode} grid-cols-${columns}">
  ${errorBanner}
  <div class="tool-grid-controls">
    ${bulkBar}
    <div class="tool-grid-controls-row">
      ${sortFilter}
      ${viewToggle}
    </div>
  </div>
  <div class="tool-grid-cards">${cardsSection}</div>
</div>`;
}

function renderErrorBanner(errorCards: ToolCardState[]): string {
  if (errorCards.length === 0) return "";
  const count = errorCards.length;
  const label = count === 1 ? "1 error" : `${count} errors`;
  const items = errorCards
    .map((card) => `<span class="error-item" data-card-id="${escapeAttr(card.id)}">${escapeHtml(card.title)}</span>`)
    .join("");

  return `<div class="error-banner" role="alert" aria-live="polite" aria-label="${escapeAttr(label)}">
  <span class="error-count-badge">${escapeHtml(label)}</span>
  ${items}
</div>`;
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

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
