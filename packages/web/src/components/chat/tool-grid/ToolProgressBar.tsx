import type { ToolStatus } from "../../../types/tool-grid";

interface ToolProgressBarProps {
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

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function ToolProgressBar({ progress, status }: ToolProgressBarProps) {
  const statusClass = STATUS_CLASS[status] ?? "tool-progress-pending";
  const isIndeterminate = progress === null;

  const ariaValuenow = isIndeterminate ? undefined : String(clamp(progress!, 0, 100));
  const fillWidth = isIndeterminate ? undefined : `${clamp(progress!, 0, 100)}%`;
  const indeterminateClass = isIndeterminate ? " tool-progress-indeterminate" : "";
  const ariaValuetext = isIndeterminate ? "indeterminate" : `${clamp(progress!, 0, 100)}% complete`;

  return (
    <div
      className={`tool-progress-track ${statusClass}`}
      role="progressbar"
      aria-valuenow={ariaValuenow}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={ariaValuetext}
      aria-label={`Tool progress: ${isIndeterminate ? "indeterminate" : `${ariaValuenow}%`}`}
    >
      <div
        className={`tool-progress-fill ${statusClass}${indeterminateClass}`}
        style={fillWidth ? { width: fillWidth } : undefined}
      />
    </div>
  );
}
