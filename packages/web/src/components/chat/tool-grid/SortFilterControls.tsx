import type { SortField, SortOrder, StatusFilter } from "../../../types/tool-grid";

interface SortFilterControlsProps {
  sortBy: SortField;
  sortOrder: SortOrder;
  filterStatus: StatusFilter;
  onSortBy: (field: SortField) => void;
  onToggleSortOrder: () => void;
  onFilterBy: (status: StatusFilter) => void;
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

export function SortFilterControls({
  sortBy,
  sortOrder,
  filterStatus,
  onSortBy,
  onToggleSortOrder,
  onFilterBy,
}: SortFilterControlsProps) {
  const directionLabel = sortOrder === "asc" ? "Ascending" : "Descending";

  return (
    <div className="sort-filter-controls">
      <div className="sort-controls-section" role="group" aria-label="Sort controls">
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => onSortBy(e.target.value as SortField)}
          aria-label="Sort by"
        >
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {SORT_LABELS[field]}
            </option>
          ))}
        </select>
        <button
          className={`sort-direction-toggle ${sortOrder === "asc" ? "sort-order-asc" : "sort-order-desc"}`}
          onClick={onToggleSortOrder}
          aria-label={`Sort ${directionLabel}`}
        >
          {directionLabel}
        </button>
      </div>
      <div className="filter-controls-section" role="group" aria-label="Filter controls">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`filter-btn${filterStatus === opt.value ? ` filter-active-${opt.value}` : ""}`}
            onClick={() => onFilterBy(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
