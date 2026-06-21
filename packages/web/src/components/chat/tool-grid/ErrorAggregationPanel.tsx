import type { ToolCardData } from "../../../types/tool-grid";

interface ErrorAggregationPanelProps {
  failedTools: ToolCardData[];
  isExpanded: boolean;
  onTogglePanel: () => void;
  onScrollToTool: (toolId: string, toolName: string) => void;
}

export function ErrorAggregationPanel({
  failedTools,
  isExpanded,
  onTogglePanel,
  onScrollToTool,
}: ErrorAggregationPanelProps) {
  const count = failedTools.length;
  if (count === 0) return null;

  const errorLabel = count === 1 ? "1 error" : `${count} errors`;

  return (
    <div className="error-aggregation-panel error-panel-sticky" role="alert" aria-live="polite" aria-label={errorLabel}>
      <div className="error-panel-header">
        <span className="error-panel-title">Errors</span>
        <span className="error-count-badge" aria-label={errorLabel}>{errorLabel}</span>
        <button
          className="error-panel-toggle"
          onClick={onTogglePanel}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse error list" : "Expand error list"}
        >
          <span className="error-panel-toggle-icon">{isExpanded ? "▼" : "▶"}</span>
        </button>
      </div>
      {isExpanded && (
        <ul className="error-item-list" role="list">
          {failedTools.map((tool) => {
            const errorMsg = tool.error?.message ?? "Unknown error";
            return (
              <li key={tool.toolId} className="error-item" role="listitem">
                <button
                  className="error-item-btn"
                  onClick={() => onScrollToTool(tool.toolId, tool.toolName)}
                  aria-label={`Jump to ${tool.toolName} error`}
                >
                  <span className="error-item-tool font-mono">{tool.toolName}</span>
                  <span className="error-item-message">{errorMsg}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
