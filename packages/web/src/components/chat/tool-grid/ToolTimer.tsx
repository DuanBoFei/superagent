import type { ToolTimerState } from "../../../hooks/use-tool-timer";

interface ToolTimerProps {
  state: ToolTimerState;
}

export function ToolTimer({ state }: ToolTimerProps) {
  const runningClass = state.running ? " tool-timer-running" : "";

  return (
    <span className={`tool-timer${runningClass}`} role="timer" aria-label={`Elapsed time: ${state.formatted}`}>
      <span className="tool-timer-text font-mono text-xs text-neutral-400 tabular-nums">{state.formatted}</span>
    </span>
  );
}
