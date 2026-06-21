import React, { useState } from "react";
import type { WebSearchCard as WebSearchCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

const AUTO_COLLAPSE_RESULTS = 5;

interface WebSearchCardProps {
  card: WebSearchCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function WebSearchCard({ card, onToggle, onCopy }: WebSearchCardProps) {
  const { query, results, totalResults } = card.content;
  const isLong = results.length > AUTO_COLLAPSE_RESULTS;
  const [expanded, setExpanded] = useState(false);
  const displayResults = isLong && !expanded ? results.slice(0, 5) : results;

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="web-search-card flex flex-col gap-1">
        <div className="search-meta flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="search-query-label">Search:</span>
          <span className="search-query font-medium text-neutral-300">{query}</span>
          <span className="search-total">{totalResults} result{totalResults !== 1 ? "s" : ""}</span>
        </div>
        <div className={`search-results flex flex-col gap-2 bg-neutral-950 rounded border border-neutral-800 px-3 py-2 ${isLong && !expanded ? "search-collapsed" : ""}`}>
          {displayResults.map((r) => (
            <div key={r.url} className="search-result flex flex-col gap-0.5">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="search-result-title text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
              >
                {r.title}
              </a>
              <span className="search-result-source text-[10px] text-neutral-500">{r.source}</span>
              <span className="search-result-snippet text-xs text-neutral-400">{r.snippet}</span>
            </div>
          ))}
        </div>
        {isLong && (
          <button
            type="button"
            className="search-expand-btn text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : `Show all ${totalResults} results`}
          </button>
        )}
      </div>
    </ToolCard>
  );
}
