import type { MetricName, SortField, SortOrder, StatusFilter, ToolCardData, ViewMode } from "../../../types/tool-grid";
import type { ToolTimerState } from "../../../hooks/use-tool-timer";
import { calculateColumns } from "../../../types/tool-grid";
import { useToolVirtualScroll } from "../../../hooks/use-tool-virtual-scroll";
import { ToolCard } from "./ToolCard";
import { SortFilterControls } from "./SortFilterControls";
import { ErrorAggregationPanel } from "./ErrorAggregationPanel";
import { BulkActionBar } from "./BulkActionBar";
import { ViewToggle } from "./ViewToggle";
import { ResourceBarChart } from "./ResourceBarChart";

export interface ToolGridProps {
  tools: ToolCardData[];
  containerWidth: number;
  sortBy: SortField;
  sortOrder: SortOrder;
  filterStatus: StatusFilter;
  viewMode: ViewMode;
  errorExpanded: boolean;
  runningCount: number;
  completedCount: number;
  showUndo: boolean;
  undoRemainingSeconds?: number;
  selectedResourceMetric: MetricName;
  scrollTop: number;
  viewportHeight: number;
  /** Injected timer states, keyed by toolId. */
  timerStates: Map<string, ToolTimerState>;
  /** ANSI-rendered bash output HTML, keyed by toolId. */
  bashOutputs: Map<string, string>;
  onToggleCard: (toolId: string) => void;
  onToggleErrorPanel: () => void;
  onScrollToTool: (toolId: string, toolName: string) => void;
  onCancelAll: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearCompleted: () => void;
  onUndoClear: () => void;
  onSetView: (mode: ViewMode) => void;
  onSortBy: (field: SortField) => void;
  onToggleSortOrder: () => void;
  onFilterBy: (status: StatusFilter) => void;
  onSelectMetric: (metric: MetricName) => void;
}

export function ToolGrid({
  tools,
  containerWidth,
  sortBy,
  sortOrder,
  filterStatus,
  viewMode,
  errorExpanded,
  runningCount,
  completedCount,
  showUndo,
  undoRemainingSeconds,
  selectedResourceMetric,
  scrollTop,
  viewportHeight,
  timerStates,
  bashOutputs,
  onToggleCard,
  onToggleErrorPanel,
  onScrollToTool,
  onCancelAll,
  onExpandAll,
  onCollapseAll,
  onClearCompleted,
  onUndoClear,
  onSetView,
  onSortBy,
  onToggleSortOrder,
  onFilterBy,
  onSelectMetric,
}: ToolGridProps) {
  const columns = calculateColumns(tools.length, viewMode, containerWidth);

  const failedTools = tools.filter((t) => t.status === "failed");

  const hasCompletedTools = tools.some(
    (t) => t.status === "success" || t.status === "failed" || t.status === "cancelled",
  );

  let cardsContent: React.ReactNode;
  if (tools.length === 0) {
    cardsContent = <div className="tool-grid-empty">No tools matching current filter</div>;
  } else {
    const vs = useToolVirtualScroll({ toolCount: tools.length, scrollTop, viewportHeight });

    if (vs.enabled && vs.window) {
      const visibleTools = tools.slice(vs.window.startIndex, vs.window.endIndex);
      cardsContent = (
        <div className="virtual-scroll-container" style={{ height: vs.window.totalHeight }}>
          <div
            className="virtual-scroll-inner"
            style={{ paddingTop: vs.window.topPadding, paddingBottom: vs.window.bottomPadding }}
          >
            {visibleTools.map((t) => (
              <ToolCard
                key={t.toolId}
                data={t}
                timerState={timerStates.get(t.toolId) ?? { formatted: "00:00", running: false, elapsedMs: 0 }}
                bashOutputHtml={bashOutputs.get(t.toolId)}
                onToggle={onToggleCard}
              />
            ))}
          </div>
        </div>
      );
    } else {
      cardsContent = tools.map((t) => (
        <ToolCard
          key={t.toolId}
          data={t}
          timerState={timerStates.get(t.toolId) ?? { formatted: "00:00", running: false, elapsedMs: 0 }}
          bashOutputHtml={bashOutputs.get(t.toolId)}
          onToggle={onToggleCard}
        />
      ));
    }
  }

  return (
    <div
      className={`tool-grid view-mode-${viewMode} grid-cols-${columns}`}
      id="tool-grid-region"
      role="region"
      aria-label="Tool execution grid"
    >
      <ErrorAggregationPanel
        failedTools={failedTools}
        isExpanded={errorExpanded}
        onTogglePanel={onToggleErrorPanel}
        onScrollToTool={onScrollToTool}
      />
      <div className="tool-grid-controls">
        <BulkActionBar
          runningCount={runningCount}
          completedCount={completedCount}
          showUndo={showUndo}
          undoRemainingSeconds={undoRemainingSeconds}
          onCancelAll={onCancelAll}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
          onClearCompleted={onClearCompleted}
          onUndoClear={onUndoClear}
        />
        <div className="tool-grid-controls-row">
          <SortFilterControls
            sortBy={sortBy}
            sortOrder={sortOrder}
            filterStatus={filterStatus}
            onSortBy={onSortBy}
            onToggleSortOrder={onToggleSortOrder}
            onFilterBy={onFilterBy}
          />
          <ViewToggle viewMode={viewMode} onSetView={onSetView} />
        </div>
        {hasCompletedTools && (
          <ResourceBarChart tools={tools} selectedMetric={selectedResourceMetric} onSelectMetric={onSelectMetric} />
        )}
      </div>
      <div className="tool-grid-cards">{cardsContent}</div>
    </div>
  );
}
