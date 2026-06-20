import type { SortField, SortOrder, StatusFilter } from "../../../types/tool-grid";

export interface SortFilterControlsProps {
  sortBy: SortField;
  sortOrder: SortOrder;
  filterStatus: StatusFilter;
}

const SORT_LABELS: Record<SortField, string> = {
  status: "Status",
  duration: "Duration",
  name: "Name",
};

const SORT_FIELDS: SortField[] = ["status", "duration", "name"];

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "failed", label: "Failed" },
  { value: "completed", label: "Completed" },
];

export function renderSortFilterControls(props: SortFilterControlsProps): string {
  const { sortBy, sortOrder, filterStatus } = props;

  const directionClass = sortOrder === "asc" ? "sort-order-asc" : "sort-order-desc";
  const directionLabel = sortOrder === "asc" ? "Ascending" : "Descending";

  const sortOptions = SORT_FIELDS.map((field) => {
    const selected = field === sortBy ? ` data-sort-selected="${field}"` : "";
    return `<option value="${escapeAttr(field)}"${selected}>${escapeHtml(SORT_LABELS[field])}</option>`;
  }).join("");

  const filterButtons = FILTER_OPTIONS.map((opt) => {
    const activeClass = filterStatus === opt.value ? ` filter-active-${opt.value}` : "";
    return `<button class="filter-btn${activeClass}" data-action="filter-by" data-filter-value="${escapeAttr(opt.value)}">${escapeHtml(opt.label)}</button>`;
  }).join("");

  return `<div class="sort-filter-controls">
  <div class="sort-controls-section">
    <select class="sort-select" data-action="sort-by" aria-label="Sort by">
      ${sortOptions}
    </select>
    <button class="sort-direction-toggle ${directionClass}" data-action="toggle-sort-order" aria-label="Sort ${directionLabel}">${directionLabel}</button>
  </div>
  <div class="filter-controls-section">
    ${filterButtons}
  </div>
</div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
