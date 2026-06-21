"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionHistoryStore } from "../../store/session-history";
import type { SearchQuery, SessionStatus, DateRange } from "../../types/session-history";

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "All time", value: "all" },
] as const;

const STATUS_OPTIONS: { label: string; value: SessionStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Error", value: "error" },
];

function getTodayRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return { start, end: Date.now() };
}

function getLast7DaysRange(): DateRange {
  const now = Date.now();
  return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
}

function getLast30DaysRange(): DateRange {
  const now = Date.now();
  return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
}

function isDateRangeEqual(a: DateRange | null, b: DateRange): boolean {
  if (!a) return false;
  return Math.abs(a.start - b.start) < 60000 && Math.abs(a.end - b.end) < 60000;
}

function getActivePreset(dateRange: DateRange | null): string | null {
  if (!dateRange) return "all";
  if (isDateRangeEqual(dateRange, getTodayRange())) return "today";
  if (isDateRangeEqual(dateRange, getLast7DaysRange())) return "7days";
  if (isDateRangeEqual(dateRange, getLast30DaysRange())) return "30days";
  return null;
}

export interface SessionSearchFilterProps {
  availableTags?: string[];
}

export function SessionSearchFilter({ availableTags = [] }: SessionSearchFilterProps) {
  const searchQuery = useSessionHistoryStore((s) => s.searchQuery);
  const setSearchQuery = useSessionHistoryStore((s) => s.setSearchQuery);
  const resetSearchQuery = useSessionHistoryStore((s) => s.resetSearchQuery);

  const [localText, setLocalText] = useState(searchQuery.text);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalText(searchQuery.text);
  }, [searchQuery.text]);

  const emitText = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery({ text });
      }, 200);
    },
    [setSearchQuery],
  );

  const activePreset = getActivePreset(searchQuery.dateRange);
  const statusFilter = searchQuery.statusFilter ?? [];
  const tagsFilter = searchQuery.tagsFilter ?? [];

  const isAnyFilterActive =
    searchQuery.text !== "" ||
    searchQuery.dateRange !== null ||
    searchQuery.statusFilter !== null ||
    searchQuery.tagsFilter !== null;

  return (
    <div className="session-search-filter px-3 py-2 border-b border-zinc-800 space-y-2" role="search">
      {/* Text input */}
      <div className="relative">
        <input
          type="text"
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-[13px] text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none placeholder:text-zinc-500"
          placeholder="Search sessions"
          value={localText}
          onChange={(e) => {
            setLocalText(e.target.value);
            emitText(e.target.value);
          }}
          aria-label="Search sessions"
        />
        {localText && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            onClick={() => {
              setLocalText("");
              setSearchQuery({ text: "" });
            }}
            type="button"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Date presets */}
      <div className="flex gap-1">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
              activePreset === p.value
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
            }`}
            onClick={() => {
              let dateRange: DateRange | null = null;
              if (p.value === "today") dateRange = getTodayRange();
              else if (p.value === "7days") dateRange = getLast7DaysRange();
              else if (p.value === "30days") dateRange = getLast30DaysRange();
              setSearchQuery({ dateRange });
            }}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex gap-1">
        {STATUS_OPTIONS.map((s) => {
          const isActive =
            (s.value === "all" && searchQuery.statusFilter === null) ||
            statusFilter.includes(s.value as SessionStatus);
          return (
            <button
              key={s.value}
              className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                isActive
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
              onClick={() => {
                const newFilter: SessionStatus[] | null =
                  s.value === "all" ? null : [s.value as SessionStatus];
                setSearchQuery({ statusFilter: newFilter });
              }}
              type="button"
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Tag chips */}
      {availableTags.length > 0 && (
        <div>
          <span className="text-[10px] text-zinc-500 block mb-1">Tags</span>
          <div className="flex flex-wrap gap-1">
            {availableTags.map((tag) => {
              const isTagActive = searchQuery.tagsFilter !== null && tagsFilter.includes(tag);
              return (
                <button
                  key={tag}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    isTagActive
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                  onClick={() => {
                    if (isTagActive) {
                      const next = tagsFilter.filter((t) => t !== tag);
                      setSearchQuery({ tagsFilter: next.length > 0 ? next : null });
                    } else {
                      setSearchQuery({
                        tagsFilter: searchQuery.tagsFilter === null ? [tag] : [...tagsFilter, tag],
                      });
                    }
                  }}
                  type="button"
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reset */}
      {isAnyFilterActive && (
        <button
          className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
          onClick={resetSearchQuery}
          type="button"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
