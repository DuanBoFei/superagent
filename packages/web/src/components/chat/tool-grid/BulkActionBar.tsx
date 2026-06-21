interface BulkActionBarProps {
  runningCount: number;
  completedCount: number;
  showUndo: boolean;
  undoRemainingSeconds?: number;
  onCancelAll: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearCompleted: () => void;
  onUndoClear: () => void;
}

export function BulkActionBar({
  runningCount,
  completedCount,
  showUndo,
  undoRemainingSeconds,
  onCancelAll,
  onExpandAll,
  onCollapseAll,
  onClearCompleted,
  onUndoClear,
}: BulkActionBarProps) {
  const cancelDisabled = runningCount === 0;
  const cancelLabel = cancelDisabled ? "Cancel All" : `Cancel All (${runningCount})`;

  const clearDisabled = completedCount === 0;

  return (
    <div className="bulk-action-bar" role="toolbar" aria-label="Tool grid bulk actions" aria-controls="tool-grid-region">
      <button
        className={`bulk-action-btn bulk-action-cancel${cancelDisabled ? " cancel-all-disabled" : ""}`}
        onClick={onCancelAll}
        disabled={cancelDisabled}
        aria-label={`Cancel ${runningCount} running tools`}
      >
        {cancelLabel}
      </button>
      <button
        className="bulk-action-btn bulk-action-expand"
        onClick={onExpandAll}
        aria-label="Expand all tool cards"
      >
        Expand All
      </button>
      <button
        className="bulk-action-btn bulk-action-collapse"
        onClick={onCollapseAll}
        aria-label="Collapse all tool cards"
      >
        Collapse All
      </button>
      {showUndo ? (
        <button className="bulk-action-btn bulk-action-undo" onClick={onUndoClear}>
          Undo ({undoRemainingSeconds ?? 5}s)
        </button>
      ) : (
        <button
          className={`bulk-action-btn bulk-action-clear${clearDisabled ? " clear-completed-disabled" : ""}`}
          onClick={onClearCompleted}
          disabled={clearDisabled}
          aria-label={`Clear ${completedCount} completed tools`}
        >
          Clear Completed
        </button>
      )}
    </div>
  );
}
