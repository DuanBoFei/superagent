import type { MetricName, SortField, SortOrder, StatusFilter, ToolCardData, ViewMode } from "../../../types/tool-grid";
import { useToolVirtualScroll } from "../../../hooks/use-tool-virtual-scroll";
import { renderToolCard } from "./ToolCard";
import { renderSortFilterControls } from "./SortFilterControls";
import { renderErrorAggregationPanel } from "./ErrorAggregationPanel";
import { renderBulkActionBar } from "./BulkActionBar";
import { renderViewToggle } from "./ViewToggle";
import { renderResourceBarChart } from "./ResourceBarChart";
import { calculateColumns } from "../../../types/tool-grid";

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
}

export function renderToolGrid(props: ToolGridProps): string {
  const {
    tools, containerWidth, sortBy, sortOrder, filterStatus, viewMode,
    errorExpanded, runningCount, completedCount, showUndo, undoRemainingSeconds,
    selectedResourceMetric, scrollTop, viewportHeight,
  } = props;

  const columns = calculateColumns(tools.length, viewMode, containerWidth);

  const failedTools = tools.filter((t) => t.status === "failed");
  const errorPanel = renderErrorAggregationPanel(failedTools, errorExpanded);

  const bulkBar = renderBulkActionBar({
    runningCount,
    completedCount,
    showUndo,
    undoRemainingSeconds,
  });

  const sortFilter = renderSortFilterControls({ sortBy, sortOrder, filterStatus });
  const viewToggle = renderViewToggle(viewMode);

  const hasCompletedTools = tools.some((t) =>
    t.status === "success" || t.status === "failed" || t.status === "cancelled"
  );
  const chart = hasCompletedTools
    ? renderResourceBarChart({ tools, selectedMetric: selectedResourceMetric })
    : "";

  let cardsHtml: string;
  if (tools.length === 0) {
    cardsHtml = `<div class="tool-grid-empty">No tools matching current filter</div>`;
  } else {
    const vs = useToolVirtualScroll({ toolCount: tools.length, scrollTop, viewportHeight });

    if (vs.enabled && vs.window) {
      const visibleTools = tools.slice(vs.window.startIndex, vs.window.endIndex);
      const items = visibleTools.map((t) => renderToolCard(t)).join("");
      cardsHtml = `<div class="virtual-scroll-container" style="height:${vs.window.totalHeight}px">
        <div class="virtual-scroll-inner" style="padding-top:${vs.window.topPadding}px;padding-bottom:${vs.window.bottomPadding}px">
          ${items}
        </div>
      </div>`;
    } else {
      cardsHtml = tools.map((t) => renderToolCard(t)).join("");
    }
  }

  return `<div class="tool-grid view-mode-${viewMode} grid-cols-${columns}" id="tool-grid-region" role="region" aria-label="Tool execution grid">
  ${errorPanel}
  <div class="tool-grid-controls">
    ${bulkBar}
    <div class="tool-grid-controls-row">
      ${sortFilter}
      ${viewToggle}
    </div>
    ${chart}
  </div>
  <div class="tool-grid-cards">${cardsHtml}</div>
</div>`;
}
