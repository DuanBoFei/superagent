import type { SearchQuery, SessionStatus, DateRange } from "../../types/session-history";

export interface SessionSearchFilterOptions {
  query: SearchQuery;
  availableTags?: string[];
  onQueryChange?: (query: SearchQuery) => void;
  onReset?: () => void;
}

export interface SessionSearchFilterController {
  attach(): void;
  detach(): void;
  focus(): void;
}

// ── Date preset helpers ─────────────────────────────────

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

import { escapeAttr, escapeHtml } from "./escape";

// ── Constants ───────────────────────────────────────────

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

// ── Render ──────────────────────────────────────────────

export function renderSessionSearchFilter(
  options: SessionSearchFilterOptions,
): string {
  const { query, availableTags } = options;
  const activePreset = getActivePreset(query.dateRange);
  const statusFilter = query.statusFilter ?? [];
  const tagsFilter = query.tagsFilter ?? [];

  const isAnyFilterActive =
    query.text !== "" ||
    query.dateRange !== null ||
    query.statusFilter !== null ||
    query.tagsFilter !== null;

  // Date presets
  const datePresetsHtml = DATE_PRESETS.map((p) => {
    const activeClass =
      activePreset === p.value ? " date-preset--active" : "";
    return `<button class="date-preset${activeClass}" data-action="date-preset" data-preset="${p.value}" type="button">${escapeHtml(p.label)}</button>`;
  }).join("");

  // Status filters
  const statusFiltersHtml = STATUS_OPTIONS.map((s) => {
    const isActive =
      (s.value === "all" && query.statusFilter === null) ||
      statusFilter.includes(s.value as SessionStatus);
    const activeClass = isActive ? " status-filter--active" : "";
    return `<button class="status-filter${activeClass}" data-filter="${s.value}" type="button">${escapeHtml(s.label)}</button>`;
  }).join("");

  // Tag chips
  let tagsSectionHtml = "";
  if (availableTags && availableTags.length > 0) {
    const chipsHtml = availableTags
      .map((tag) => {
        const isTagActive =
          query.tagsFilter !== null && tagsFilter.includes(tag);
        const activeClass = isTagActive ? " tag-filter--active" : "";
        return `<button class="tag-chip${activeClass}" data-tag="${escapeAttr(tag)}" type="button">${escapeHtml(tag)}</button>`;
      })
      .join("");
    tagsSectionHtml = `<div class="tags-section"><span class="tags-heading">Tags</span><div class="tags-chips">${chipsHtml}</div></div>`;
  }

  // Reset button
  const resetHtml = isAnyFilterActive
    ? `<button class="reset-filters" data-action="reset-filters" type="button">Reset filters</button>`
    : "";

  // Clear button
  const clearHtml =
    query.text !== ""
      ? `<button class="search-clear" data-action="clear-search" type="button" aria-label="Clear search">&times;</button>`
      : "";

  return `<div class="session-search-filter" role="search">
    <div class="search-input-wrapper">
      <input type="text" class="search-input" placeholder="Search sessions" value="${escapeAttr(query.text)}" aria-label="Search sessions" />
      ${clearHtml}
    </div>
    <div class="date-presets">
      ${datePresetsHtml}
    </div>
    <div class="status-filters">
      ${statusFiltersHtml}
    </div>
    ${tagsSectionHtml}
    ${resetHtml}
  </div>`;
}

// ── Controller ──────────────────────────────────────────

export function createSessionSearchFilterController(
  el: HTMLElement,
  options: SessionSearchFilterOptions,
): SessionSearchFilterController {
  const { onQueryChange, onReset } = options;

  let currentQuery: SearchQuery = { ...options.query };
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let searchInput: HTMLInputElement | null = null;

  function emitChange(newQuery: SearchQuery): void {
    currentQuery = newQuery;
    onQueryChange?.(newQuery);
  }

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Clear search
    if (target.closest('[data-action="clear-search"]')) {
      emitChange({ ...currentQuery, text: "" });
      if (searchInput) searchInput.value = "";
      return;
    }

    // Reset filters
    if (target.closest('[data-action="reset-filters"]')) {
      onReset?.();
      return;
    }

    // Date preset
    const dateBtn = target.closest<HTMLElement>(
      '[data-action="date-preset"]',
    );
    if (dateBtn) {
      const preset = dateBtn.getAttribute("data-preset");
      let dateRange: DateRange | null = null;
      if (preset === "today") dateRange = getTodayRange();
      else if (preset === "7days") dateRange = getLast7DaysRange();
      else if (preset === "30days") dateRange = getLast30DaysRange();
      emitChange({ ...currentQuery, dateRange });
      return;
    }

    // Status filter
    const statusBtn = target.closest<HTMLElement>("[data-filter]");
    if (statusBtn) {
      const filter = statusBtn.getAttribute("data-filter")!;
      const statusFilter: SessionStatus[] | null =
        filter === "all" ? null : [filter as SessionStatus];
      emitChange({ ...currentQuery, statusFilter });
      return;
    }

    // Tag chip
    const tagBtn = target.closest<HTMLElement>("[data-tag]");
    if (tagBtn) {
      const tag = tagBtn.getAttribute("data-tag")!;
      const currentTags = currentQuery.tagsFilter ?? [];
      let tagsFilter: string[] | null;
      if (currentTags.includes(tag)) {
        const next = currentTags.filter((t) => t !== tag);
        tagsFilter = next.length > 0 ? next : null;
      } else {
        tagsFilter =
          currentQuery.tagsFilter === null
            ? [tag]
            : [...currentTags, tag];
      }
      emitChange({ ...currentQuery, tagsFilter });
      return;
    }
  }

  function onInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      emitChange({ ...currentQuery, text: input.value });
    }, 200);
  }

  return {
    attach(): void {
      searchInput = el.querySelector<HTMLInputElement>(
        'input[type="text"]',
      );
      el.addEventListener("click", onClick);
      if (searchInput) {
        searchInput.addEventListener("input", onInput);
      }
    },

    detach(): void {
      el.removeEventListener("click", onClick);
      if (searchInput) {
        searchInput.removeEventListener("input", onInput);
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      searchInput = null;
      debounceTimer = null;
    },

    focus(): void {
      if (searchInput) {
        searchInput.focus();
      }
    },
  };
}
