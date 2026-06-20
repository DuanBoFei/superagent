export interface BulkActionBarProps {
  runningCount: number;
  completedCount: number;
  showUndo: boolean;
  undoRemainingSeconds?: number;
}

export function renderBulkActionBar(props: BulkActionBarProps): string {
  const { runningCount, completedCount, showUndo, undoRemainingSeconds } = props;

  const cancelDisabled = runningCount === 0;
  const cancelClass = cancelDisabled ? " cancel-all-disabled" : "";
  const cancelDisabledAttr = cancelDisabled ? " disabled" : "";
  const cancelLabel = cancelDisabled ? "Cancel All" : `Cancel All (${runningCount})`;

  const clearDisabled = completedCount === 0;
  const clearClass = clearDisabled ? " clear-completed-disabled" : "";
  const clearDisabledAttr = clearDisabled ? " disabled" : "";

  let clearButton: string;
  if (showUndo) {
    const secs = undoRemainingSeconds ?? 5;
    clearButton = `<button class="bulk-action-btn bulk-action-undo" data-action="undo-clear">Undo (${escapeHtml(String(secs))}s)</button>`;
  } else {
    clearButton = `<button class="bulk-action-btn bulk-action-clear${clearClass}" data-action="clear-completed"${clearDisabledAttr} aria-label="Clear ${completedCount} completed tools">Clear Completed</button>`;
  }

  return `<div class="bulk-action-bar" role="toolbar" aria-label="Tool grid bulk actions" aria-controls="tool-grid-region">
  <button class="bulk-action-btn bulk-action-cancel${cancelClass}" data-action="cancel-all"${cancelDisabledAttr} aria-label="Cancel ${runningCount} running tools">${escapeHtml(cancelLabel)}</button>
  <button class="bulk-action-btn bulk-action-expand" data-action="expand-all" aria-label="Expand all tool cards">Expand All</button>
  <button class="bulk-action-btn bulk-action-collapse" data-action="collapse-all" aria-label="Collapse all tool cards">Collapse All</button>
  ${clearButton}
</div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
