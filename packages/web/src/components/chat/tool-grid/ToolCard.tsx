import type { ToolCardData } from "../../../types/tool-grid";
import type { ToolTimerState } from "../../../hooks/use-tool-timer";
import { ToolTimer } from "./ToolTimer";
import { ToolProgressBar } from "./ToolProgressBar";

interface ToolCardProps {
  data: ToolCardData;
  /** Timer state injected by parent (computed from data.startTime/endTime/durationMs). */
  timerState: ToolTimerState;
  /** ANSI-rendered bash output HTML (injected by parent when needed). */
  bashOutputHtml?: string;
  onToggle: (toolId: string) => void;
}

// ── Tool Label ──────────────────────────────────────────

const TOOL_LABEL: Record<string, string> = {
  read: "Read",
  write: "Write",
  edit: "Edit",
  bash: "Bash",
  grep: "Grep",
  glob: "Glob",
  task: "Task",
  websearch: "WebSearch",
};

function toolLabel(name: string): string {
  return TOOL_LABEL[name.toLowerCase()] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Parameter Summary ───────────────────────────────────

function renderParams(params: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(params);
  if (entries.length === 0) return null;
  return (
    <div className="tool-params">
      {entries.slice(0, 3).map(([key, value]) => {
        const val = typeof value === "string" ? value : JSON.stringify(value);
        return (
          <span key={key} className="tool-param">
            <span className="tool-param-key">{key}</span>: {val}
          </span>
        );
      })}
    </div>
  );
}

// ── Output Rendering ────────────────────────────────────

function renderOutput(
  preview: string[],
  full: string,
  expanded: boolean,
  toolName: string,
  bashOutputHtml?: string,
): React.ReactNode {
  if (!full && preview.length === 0) return null;

  if (expanded && toolName === "bash" && bashOutputHtml) {
    return (
      <div className="tool-output-full" dangerouslySetInnerHTML={{ __html: bashOutputHtml }} />
    );
  }

  if (expanded) {
    return (
      <div className="tool-output-full">
        <pre className="tool-output-pre">
          {full.split("\n").map((line, i) => (
            <span key={i} className="tool-output-line">{line}</span>
          ))}
        </pre>
      </div>
    );
  }

  return (
    <div className="tool-output-preview">
      <pre className="tool-output-pre">
        {preview.map((line, i) => (
          <span key={i} className="tool-output-line">{line}</span>
        ))}
      </pre>
    </div>
  );
}

// ── Error Rendering ─────────────────────────────────────

function renderError(error: { message: string; stack?: string }): React.ReactNode {
  return (
    <div className="tool-card-error">
      <span className="tool-error-message">{error.message}</span>
      {error.stack && <pre className="tool-error-stack">{error.stack}</pre>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

export function ToolCard({ data, timerState, bashOutputHtml, onToggle }: ToolCardProps) {
  const { toolId, toolName, parameters, status, progress, isExpanded, error, outputPreview, fullOutput } = data;
  const label = toolLabel(toolName);

  return (
    <div
      className={`tool-card card-status-${status}`}
      data-tool-id={toolId}
      data-status={status}
      role="article"
      aria-label={`${label} tool: ${toolName}`}
      tabIndex={0}
    >
      <div className="tool-card-header">
        <span className="tool-card-label">{label}</span>
        <span className="tool-card-name font-mono text-xs text-neutral-400">{toolName}</span>
        <ToolTimer state={timerState} />
        <button
          className="tool-card-toggle"
          onClick={() => onToggle(toolId)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse tool card" : "Expand tool card"}
        >
          <span className="tool-card-toggle-icon">{isExpanded ? "▼" : "▶"}</span>
        </button>
      </div>
      <div className="tool-card-body">
        {renderParams(parameters)}
        <ToolProgressBar progress={progress} status={status} />
        {renderOutput(outputPreview, fullOutput, isExpanded, toolName, bashOutputHtml)}
        {error && renderError(error)}
      </div>
    </div>
  );
}
