import type { ViewMode } from "../../../types/tool-grid";

interface ViewToggleProps {
  viewMode: ViewMode;
  onSetView: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onSetView }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="View mode">
      <button
        className={`view-toggle-btn${viewMode === "grid" ? " view-active-grid" : ""}`}
        onClick={() => onSetView("grid")}
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
      >
        Grid
      </button>
      <button
        className={`view-toggle-btn${viewMode === "list" ? " view-active-list" : ""}`}
        onClick={() => onSetView("list")}
        aria-label="List view"
        aria-pressed={viewMode === "list"}
      >
        List
      </button>
    </div>
  );
}
