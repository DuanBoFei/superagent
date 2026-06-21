"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TAG_COLORS = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

function hashTagColor(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % TAG_COLORS.length;
}

export interface TagManagerProps {
  tags: string[];
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onTagClick?: (tag: string) => void;
}

export function TagManager({ tags, onAddTag, onRemoveTag, onTagClick }: TagManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const value = inputValue.trim();
      if (!value || tags.includes(value)) return;
      onAddTag?.(value);
      setInputValue("");
    },
    [inputValue, tags, onAddTag],
  );

  const handleRemove = useCallback(
    (tag: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveTag?.(tag);
    },
    [onRemoveTag],
  );

  const handleChipClick = useCallback(
    (tag: string) => () => {
      onTagClick?.(tag);
    },
    [onTagClick],
  );

  return (
    <div className={`tag-manager ${tags.length === 0 ? "tag-manager--empty" : ""}`}>
      <div className="tag-manager-input-row mb-2">
        <input
          ref={inputRef}
          type="text"
          className="tag-manager-input w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[12px] text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none placeholder:text-zinc-500"
          placeholder="Add tag..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Add tag"
        />
      </div>
      <div className="tag-manager-chips flex flex-wrap gap-1">
        {tags.length === 0 && (
          <span className="text-[11px] text-zinc-500">Add tags to organize sessions</span>
        )}
        {tags.map((tag) => {
          const colorIndex = hashTagColor(tag);
          const color = TAG_COLORS[colorIndex];
          return (
            <span
              key={tag}
              className="tag-chip inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase cursor-pointer transition-colors"
              style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
              role="button"
              tabIndex={0}
              aria-label={`Remove tag ${tag}`}
              onClick={handleChipClick(tag)}
            >
              <span className="tag-chip-text">{tag}</span>
              <button
                className="tag-chip-remove hover:opacity-70"
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={handleRemove(tag)}
              >
                &times;
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
