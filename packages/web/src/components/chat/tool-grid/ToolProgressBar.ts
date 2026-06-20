import type { ToolStatus } from "../../../types/tool-grid";

export interface ToolProgressBarProps {
  progress: number | null;
  status: ToolStatus;
}

const STATUS_CLASS: Record<ToolStatus, string> = {
  pending: "tool-progress-pending",
  running: "tool-progress-running",
  success: "tool-progress-success",
  failed: "tool-progress-failed",
  cancelled: "tool-progress-cancelled",
};

export function renderToolProgressBar(props: ToolProgressBarProps): string {
  const { progress, status } = props;
  const statusClass = STATUS_CLASS[status] ?? "tool-progress-pending";
  const isIndeterminate = progress === null;

  const ariaValuenow = isIndeterminate ? "" : String(clamp(progress!, 0, 100));
  const fillWidth = isIndeterminate ? "" : `width: ${clamp(progress!, 0, 100)}%`;
  const indeterminateClass = isIndeterminate ? " tool-progress-indeterminate" : "";

  return `<div class="tool-progress-track ${statusClass}" role="progressbar" aria-valuenow="${escapeAttr(ariaValuenow)}" aria-valuemin="0" aria-valuemax="100" aria-label="Tool progress: ${isIndeterminate ? "indeterminate" : ariaValuenow + "%"}">
  <div class="tool-progress-fill ${statusClass}${indeterminateClass}" style="${fillWidth}"></div>
</div>`;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
