import type { WebSearchCard } from "../../../types/cards";

const AUTO_COLLAPSE_RESULTS = 5;

export function renderWebSearchCard(card: WebSearchCard): string {
  const { query, results, totalResults } = card.content;
  const isLong = results.length > AUTO_COLLAPSE_RESULTS;
  const displayResults = isLong ? results.slice(0, 5) : results;

  const resultItems = displayResults.map((r) => {
    return `<div class="search-result flex flex-col gap-0.5">
      <a href="${escapeAttr(r.url)}" target="_blank" rel="noopener noreferrer" class="search-result-title text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline">${escapeHtml(r.title)}</a>
      <span class="search-result-source text-[10px] text-neutral-500">${escapeHtml(r.source)}</span>
      <span class="search-result-snippet text-xs text-neutral-400">${escapeHtml(r.snippet)}</span>
    </div>`;
  }).join("\n");

  const toggle = isLong
    ? `<button type="button" class="search-expand-btn" data-action="expand-search" data-card-id="${escapeAttr(card.id)}">Show all ${totalResults} results</button>`
    : "";

  return `<div class="web-search-card flex flex-col gap-1">
    <div class="search-meta flex items-center gap-2 text-[11px] text-neutral-500">
      <span class="search-query-label">Search:</span>
      <span class="search-query font-medium text-neutral-300">${escapeHtml(query)}</span>
      <span class="search-total">${totalResults} result${totalResults !== 1 ? "s" : ""}</span>
    </div>
    <div class="search-results flex flex-col gap-2 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 ${isLong ? "search-collapsed" : ""}">
      ${resultItems}
    </div>
    ${toggle}
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
