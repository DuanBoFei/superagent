/**
 * ToolGrid fixture generator — renders all ToolGrid component states into static HTML.
 * Used by Playwright for visual regression (screenshots) and a11y audit (axe-core).
 */
import { renderToolCard } from "../../packages/web/src/components/chat/tool-grid/ToolCard";
import { renderToolGrid } from "../../packages/web/src/components/chat/tool-grid/ToolGrid";
import { renderBulkActionBar } from "../../packages/web/src/components/chat/tool-grid/BulkActionBar";
import { renderSortFilterControls } from "../../packages/web/src/components/chat/tool-grid/SortFilterControls";
import { renderViewToggle } from "../../packages/web/src/components/chat/tool-grid/ViewToggle";
import { renderResourceBarChart } from "../../packages/web/src/components/chat/tool-grid/ResourceBarChart";
import { renderErrorAggregationPanel } from "../../packages/web/src/components/chat/tool-grid/ErrorAggregationPanel";
import type { ToolCardData } from "../../packages/web/src/types/tool-grid";

const NOW = Date.now();

function t(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: "t1",
    toolName: "Read",
    parameters: { file_path: "/src/app.ts" },
    status: "running",
    progress: null,
    startTime: NOW - 5000,
    endTime: null,
    durationMs: null,
    outputPreview: [],
    fullOutput: "",
    error: null,
    isExpanded: false,
    resourceUsage: { outputBytes: 0 },
    ...overrides,
  };
}

// ── ToolCard: all 5 statuses ──────────────────────────────

export function createAllStatusCards(): ToolCardData[] {
  return [
    t({ toolId: "card-pending",  toolName: "Read", status: "pending",  progress: 0,   isExpanded: true, startTime: NOW - 1000,  endTime: null, durationMs: null, parameters: { file_path: "/src/config.ts" }, outputPreview: ["Waiting..."], fullOutput: "" }),
    t({ toolId: "card-running",  toolName: "Bash", status: "running",  progress: 60,  isExpanded: true, startTime: NOW - 8000,  endTime: null, durationMs: null, parameters: { command: "npm run build" }, outputPreview: ["Compiling 142 modules..."], fullOutput: "Compiling 142 modules...\n✓ Build complete in 3.2s" }),
    t({ toolId: "card-success",  toolName: "Grep", status: "success",  progress: 100, isExpanded: true, startTime: NOW - 15000, endTime: NOW - 1000, durationMs: 14000, parameters: { pattern: "handleSubmit" }, outputPreview: ["3 matches in 142 files"], fullOutput: "src/login.ts:42: handleSubmit\ntests/login.test.ts:15: handleSubmit" }),
    t({ toolId: "card-failed",   toolName: "Bash", status: "failed",   progress: null, isExpanded: true, startTime: NOW - 10000, endTime: NOW - 3000, durationMs: 7000, parameters: { command: "npm test" }, outputPreview: ["FAIL  src/login.test.ts"], fullOutput: "FAIL  src/login.test.ts\n  ✗ should handle async submit\nTests: 1 failed, 1 total", error: { message: "Command exited with code 1", stack: "Error: Command exited with code 1\n    at BashTool.execute (bash.ts:142)" } }),
    t({ toolId: "card-cancelled", toolName: "Read", status: "cancelled", progress: 45, isExpanded: true, startTime: NOW - 5000,  endTime: NOW - 2000, durationMs: 3000, parameters: { file_path: "/src/large.ts" }, outputPreview: ["Reading file... (cancel"], fullOutput: "Reading file... (cancelled by user)", cancelledAt: NOW - 2000 }),
  ];
}

export function createAllStatusCardsCollapsed(): ToolCardData[] {
  return createAllStatusCards().map((c) => ({ ...c, isExpanded: false }));
}

// ── ToolGrid: 1/2/3 column layouts ────────────────────────

function makeGridTools(count: number): ToolCardData[] {
  const names = ["Read", "Bash", "Grep", "Glob", "Write", "Edit", "Task", "WebSearch"];
  return Array.from({ length: count }, (_, i) =>
    t({
      toolId: `grid-t${i + 1}`,
      toolName: names[i % names.length],
      status: i % 3 === 0 ? "success" : i % 3 === 1 ? "running" : "pending",
      progress: i % 3 === 0 ? 100 : i % 3 === 1 ? 50 : 0,
      isExpanded: false,
      startTime: NOW - (count - i) * 2000,
      endTime: i % 3 === 0 ? NOW - 1000 : null,
      durationMs: i % 3 === 0 ? (count - i) * 2000 - 1000 : null,
      parameters: { file_path: `/src/module${i}.ts` },
      outputPreview: [`Tool ${i + 1} output line 1`, `Tool ${i + 1} output line 2`],
      fullOutput: `Tool ${i + 1} full output\nLine 1\nLine 2\nLine 3`,
      resourceUsage: { outputBytes: (i + 1) * 512 },
    }),
  );
}

function gridProps(toolCount: number, viewMode: "grid" | "list" = "grid", containerWidth = 1200) {
  const tools = makeGridTools(toolCount);
  const runningCount = tools.filter((t) => t.status === "running" || t.status === "pending").length;
  const completedCount = tools.filter((t) => t.status === "success" || t.status === "failed").length;
  return {
    tools,
    containerWidth,
    sortBy: "status" as const,
    sortOrder: "asc" as const,
    filterStatus: "all" as const,
    viewMode,
    errorExpanded: false,
    runningCount,
    completedCount,
    showUndo: false,
    selectedResourceMetric: "duration" as const,
    scrollTop: 0,
    viewportHeight: 800,
  };
}

export function renderGrid2Col(): string {
  return renderToolGrid(gridProps(4, "grid", 900));
}

export function renderGrid3Col(): string {
  return renderToolGrid(gridProps(9, "grid", 1400));
}

export function renderGrid1Col(): string {
  return renderToolGrid(gridProps(2, "grid", 500));
}

export function renderGridListView(): string {
  return renderToolGrid(gridProps(4, "list", 1200));
}

export function renderGridWithErrors(): string {
  const props = gridProps(6, "grid", 1200);
  const toolsWithErrors = props.tools.map((tool, i) =>
    i === 1 || i === 3 ? { ...tool, status: "failed" as const, error: { message: `Error in ${tool.toolName}: something went wrong` } } : tool,
  );
  return renderToolGrid({ ...props, tools: toolsWithErrors, errorExpanded: true });
}

export function renderGridEmpty(): string {
  return renderToolGrid({
    tools: [],
    containerWidth: 1200,
    sortBy: "status",
    sortOrder: "asc",
    filterStatus: "all",
    viewMode: "grid",
    errorExpanded: false,
    runningCount: 0,
    completedCount: 0,
    showUndo: false,
    selectedResourceMetric: "duration",
    scrollTop: 0,
    viewportHeight: 800,
  });
}

// ── BulkActionBar variations ───────────────────────────────

export function renderBulkWithRunning(): string {
  return renderBulkActionBar({ runningCount: 3, completedCount: 2, showUndo: false });
}

export function renderBulkNoRunning(): string {
  return renderBulkActionBar({ runningCount: 0, completedCount: 5, showUndo: false });
}

export function renderBulkUndo(): string {
  return renderBulkActionBar({ runningCount: 0, completedCount: 3, showUndo: true, undoRemainingSeconds: 4 });
}

export function renderBulkEmpty(): string {
  return renderBulkActionBar({ runningCount: 0, completedCount: 0, showUndo: false });
}

// ── SortFilterControls ────────────────────────────────────

export function renderSortStatusAsc(): string {
  return renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
}

export function renderSortDurationDesc(): string {
  return renderSortFilterControls({ sortBy: "duration", sortOrder: "desc", filterStatus: "running" });
}

export function renderSortNameAsc(): string {
  return renderSortFilterControls({ sortBy: "name", sortOrder: "asc", filterStatus: "failed" });
}

export function renderFilterCompleted(): string {
  return renderSortFilterControls({ sortBy: "status", sortOrder: "desc", filterStatus: "completed" });
}

// ── ViewToggle ────────────────────────────────────────────

export function renderGridActive(): string {
  return renderViewToggle("grid");
}

export function renderListActive(): string {
  return renderViewToggle("list");
}

// ── ResourceBarChart ──────────────────────────────────────

function chartTools(): ToolCardData[] {
  return [
    t({ toolId: "ch-a", toolName: "Read",  status: "success",   durationMs: 5000,  resourceUsage: { outputBytes: 4096 } }),
    t({ toolId: "ch-b", toolName: "Bash",  status: "failed",    durationMs: 12000, resourceUsage: { outputBytes: 8192 } }),
    t({ toolId: "ch-c", toolName: "Grep",  status: "success",   durationMs: 2000,  resourceUsage: { outputBytes: 1024 } }),
    t({ toolId: "ch-d", toolName: "Glob",  status: "cancelled", durationMs: 800,   resourceUsage: { outputBytes: 512 } }),
    t({ toolId: "ch-e", toolName: "Write", status: "success",   durationMs: 15000, resourceUsage: { outputBytes: 16384 } }),
  ];
}

export function renderChartDuration(): string {
  return renderResourceBarChart({ tools: chartTools(), selectedMetric: "duration" });
}

export function renderChartOutputSize(): string {
  return renderResourceBarChart({ tools: chartTools(), selectedMetric: "outputSize" });
}

export function renderChartNoData(): string {
  return renderResourceBarChart({ tools: [], selectedMetric: "duration" });
}

// ── ErrorAggregationPanel ─────────────────────────────────

function errorTools(): ToolCardData[] {
  return [
    t({ toolId: "err-1", toolName: "Bash", status: "failed", error: { message: "Command exited with code 1" } }),
    t({ toolId: "err-2", toolName: "Grep", status: "failed", error: { message: "Invalid regex pattern" } }),
    t({ toolId: "err-3", toolName: "Read", status: "failed", error: { message: "File not found: /nonexistent" } }),
  ];
}

export function renderErrorPanelExpanded(): string {
  return renderErrorAggregationPanel(errorTools(), true);
}

export function renderErrorPanelCollapsed(): string {
  return renderErrorAggregationPanel(errorTools(), false);
}

export function renderErrorPanelSingle(): string {
  return renderErrorAggregationPanel([errorTools()[0]], true);
}

export function renderErrorPanelEmpty(): string {
  return renderErrorAggregationPanel([], false);
}

// ── Full fixture page ─────────────────────────────────────

export function generateToolGridFixtureHtml(): string {
  const statusCards = createAllStatusCards();
  const collapsedCards = createAllStatusCardsCollapsed();

  const statusCardsHtml = statusCards.map((c) => renderToolCard(c)).join("\n");
  const collapsedCardsHtml = collapsedCards.map((c) => renderToolCard(c)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ToolGrid — Visual Regression & a11y Fixture</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background-color: #0a0a0a;
      color: #fafafa;
      font-family: Inter, system-ui, sans-serif;
      padding: 24px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #a1a1aa;
      margin-bottom: 16px;
      margin-top: 32px;
      border-bottom: 1px solid #1f1f23;
      padding-bottom: 8px;
    }
    .section-title:first-child {
      margin-top: 0;
    }
    /* Minimal card styles so screenshots have visual structure */
    .tool-card {
      background: #0d0d0d;
      border: 1px solid #1f1f23;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .tool-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .tool-card-label {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #10b981;
    }
    .tool-card-name {
      font-family: "JetBrains Mono", monospace;
      font-size: 12px;
      color: #a1a1aa;
    }
    .tool-card-toggle {
      margin-left: auto;
      background: none;
      border: 1px solid #1f1f23;
      color: #fafafa;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 10px;
    }
    .tool-card-body {
      font-size: 13px;
    }
    .tool-progress-track {
      height: 4px;
      background: #1f1f23;
      border-radius: 2px;
      margin: 8px 0;
      overflow: hidden;
    }
    .tool-progress-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .tool-progress-running .tool-progress-fill { background: #10b981; }
    .tool-progress-success .tool-progress-fill { background: #10b981; }
    .tool-progress-failed .tool-progress-fill { background: #ef4444; }
    .tool-progress-cancelled .tool-progress-fill { background: #71717a; }
    .tool-progress-pending .tool-progress-fill { background: #3f3f46; }
    .tool-progress-indeterminate {
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .card-status-success { border-left: 2px solid #10b981; }
    .card-status-failed { border-left: 2px solid #ef4444; }
    .card-status-running { border-left: 2px solid #10b981; }
    .card-status-pending { border-left: 2px solid #3f3f46; }
    .card-status-cancelled { border-left: 2px solid #71717a; }
    .tool-output-preview pre,
    .tool-output-full pre {
      background: #050505;
      padding: 8px;
      border-radius: 4px;
      font-family: "JetBrains Mono", monospace;
      font-size: 12px;
      color: #d4d4d8;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .tool-param { font-size: 11px; color: #a1a1aa; display: block; }
    .tool-param-key { color: #10b981; }
    .tool-card-error { color: #ef4444; font-size: 12px; margin-top: 4px; }
    .tool-error-stack { color: #71717a; font-size: 10px; }
    .tool-timer { font-size: 11px; color: #a1a1aa; }
    .tool-timer-running { color: #10b981; }
    /* BulkActionBar */
    .bulk-action-bar { display: flex; gap: 8px; margin-bottom: 12px; }
    .bulk-action-btn {
      background: #0d0d0d;
      border: 1px solid #1f1f23;
      color: #fafafa;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
    }
    .bulk-action-btn[disabled] { opacity: 0.4; cursor: default; }
    .bulk-action-undo { border-color: #10b981; color: #10b981; }
    /* SortFilterControls */
    .sort-filter-controls { display: flex; gap: 12px; margin-bottom: 8px; align-items: center; }
    .sort-select {
      background: #0d0d0d;
      border: 1px solid #1f1f23;
      color: #fafafa;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .sort-direction-toggle {
      background: #0d0d0d;
      border: 1px solid #1f1f23;
      color: #fafafa;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    .filter-btn {
      background: #0d0d0d;
      border: 1px solid #1f1f23;
      color: #a1a1aa;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    .filter-active-running { border-color: #10b981; color: #10b981; }
    .filter-active-failed { border-color: #ef4444; color: #ef4444; }
    .filter-active-completed { border-color: #3b82f6; color: #3b82f6; }
    .filter-active-all { border-color: #fafafa; color: #fafafa; }
    /* ViewToggle */
    .view-toggle { display: flex; gap: 4px; }
    .view-toggle-btn {
      background: #0d0d0d;
      border: 1px solid #1f1f23;
      color: #a1a1aa;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    .view-active-grid, .view-active-list { border-color: #10b981; color: #10b981; }
    /* ResourceBarChart */
    .resource-bar-chart { background: #0d0d0d; border: 1px solid #1f1f23; border-radius: 4px; padding: 12px; }
    .chart-metric-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
    .metric-tab {
      background: #0d0d0d;
      border: 1px solid #1f1f23;
      color: #a1a1aa;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    .metric-active-duration, .metric-active-outputSize { border-color: #10b981; color: #10b981; }
    .tool-chart-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px; }
    .tool-chart-name { width: 60px; color: #a1a1aa; flex-shrink: 0; }
    .tool-chart-bar-wrap { flex: 1; height: 8px; background: #1f1f23; border-radius: 2px; overflow: hidden; }
    .tool-chart-bar { height: 100%; border-radius: 2px; }
    .bar-color-success { background: #10b981; }
    .bar-color-failed { background: #ef4444; }
    .bar-color-cancelled { background: #71717a; }
    .tool-chart-value { width: 50px; text-align: right; color: #fafafa; flex-shrink: 0; }
    .chart-no-data { color: #71717a; font-size: 12px; }
    /* ErrorAggregationPanel */
    .error-aggregation-panel { background: #0d0d0d; border: 1px solid #ef4444; border-radius: 4px; padding: 12px; margin-bottom: 12px; }
    .error-panel-header { display: flex; align-items: center; gap: 8px; }
    .error-panel-title { font-weight: 600; color: #ef4444; font-size: 12px; }
    .error-count-badge { background: #ef4444; color: #fff; padding: 1px 6px; border-radius: 8px; font-size: 10px; }
    .error-panel-toggle { margin-left: auto; background: none; border: 1px solid #1f1f23; color: #fafafa; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 10px; }
    .error-item-list { list-style: none; padding: 0; margin-top: 8px; }
    .error-item { background: #18181b; border-radius: 4px; margin-bottom: 4px; }
    .error-item-btn { background: none; border: none; color: inherit; display: block; width: 100%; padding: 6px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; text-align: left; }
    .error-item-tool { color: #fafafa; font-weight: 600; }
    .error-item-message { color: #ef4444; margin-left: 8px; }
    /* ToolGrid */
    .tool-grid { }
    .tool-grid-controls { margin-bottom: 16px; }
    .tool-grid-controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .tool-grid-cards { }
    .tool-grid-empty { color: #71717a; font-size: 13px; text-align: center; padding: 32px; }
    .grid-cols-2 .tool-grid-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-cols-3 .tool-grid-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  </style>
</head>
<body>
  <div class="container" style="max-width:1400px; margin:0 auto;">

    <!-- ToolCards: all 5 statuses -->
    <h1 class="section-title">ToolCard — All 5 Statuses (Expanded)</h1>
    ${statusCardsHtml}

    <!-- ToolCards: collapsed -->
    <h1 class="section-title">ToolCard — All 5 Statuses (Collapsed)</h1>
    ${collapsedCardsHtml}

    <!-- ToolGrid: 3-column layout -->
    <h1 class="section-title">ToolGrid — 3-Column Grid (9 tools, width:1400px)</h1>
    ${renderGrid3Col()}

    <!-- ToolGrid: 2-column layout -->
    <h1 class="section-title">ToolGrid — 2-Column Grid (4 tools, width:900px)</h1>
    ${renderGrid2Col()}

    <!-- ToolGrid: 1-column layout -->
    <h1 class="section-title">ToolGrid — 1-Column (2 tools, width:500px)</h1>
    ${renderGrid1Col()}

    <!-- ToolGrid: list view -->
    <h1 class="section-title">ToolGrid — List View</h1>
    ${renderGridListView()}

    <!-- ToolGrid: with errors -->
    <h1 class="section-title">ToolGrid — With Error Aggregation</h1>
    ${renderGridWithErrors()}

    <!-- ToolGrid: empty -->
    <h1 class="section-title">ToolGrid — Empty State</h1>
    ${renderGridEmpty()}

    <!-- BulkActionBar: with running -->
    <h1 class="section-title">BulkActionBar — With Running Tools</h1>
    ${renderBulkWithRunning()}

    <!-- BulkActionBar: no running -->
    <h1 class="section-title">BulkActionBar — No Running Tools</h1>
    ${renderBulkNoRunning()}

    <!-- BulkActionBar: undo mode -->
    <h1 class="section-title">BulkActionBar — Undo Mode</h1>
    ${renderBulkUndo()}

    <!-- BulkActionBar: empty -->
    <h1 class="section-title">BulkActionBar — Empty (All Disabled)</h1>
    ${renderBulkEmpty()}

    <!-- SortFilterControls: defaults -->
    <h1 class="section-title">SortFilterControls — Status Asc, Filter All</h1>
    ${renderSortStatusAsc()}

    <!-- SortFilterControls: duration desc -->
    <h1 class="section-title">SortFilterControls — Duration Desc, Filter Running</h1>
    ${renderSortDurationDesc()}

    <!-- SortFilterControls: name asc -->
    <h1 class="section-title">SortFilterControls — Name Asc, Filter Failed</h1>
    ${renderSortNameAsc()}

    <!-- SortFilterControls: completed -->
    <h1 class="section-title">SortFilterControls — Status Desc, Filter Completed</h1>
    ${renderFilterCompleted()}

    <!-- ViewToggle: grid active -->
    <h1 class="section-title">ViewToggle — Grid Active</h1>
    ${renderGridActive()}

    <!-- ViewToggle: list active -->
    <h1 class="section-title">ViewToggle — List Active</h1>
    ${renderListActive()}

    <!-- ResourceBarChart: duration -->
    <h1 class="section-title">ResourceBarChart — Duration Metric</h1>
    ${renderChartDuration()}

    <!-- ResourceBarChart: output size -->
    <h1 class="section-title">ResourceBarChart — Output Size Metric</h1>
    ${renderChartOutputSize()}

    <!-- ResourceBarChart: no data -->
    <h1 class="section-title">ResourceBarChart — No Data</h1>
    ${renderChartNoData()}

    <!-- ErrorAggregationPanel: expanded -->
    <h1 class="section-title">ErrorAggregationPanel — Expanded (3 Errors)</h1>
    ${renderErrorPanelExpanded()}

    <!-- ErrorAggregationPanel: collapsed -->
    <h1 class="section-title">ErrorAggregationPanel — Collapsed</h1>
    ${renderErrorPanelCollapsed()}

    <!-- ErrorAggregationPanel: single -->
    <h1 class="section-title">ErrorAggregationPanel — Single Error</h1>
    ${renderErrorPanelSingle()}

    <!-- ErrorAggregationPanel: empty (should render nothing) -->
    <h1 class="section-title">ErrorAggregationPanel — Empty (No Output Expected Below)</h1>
    <div id="error-empty-marker"></div>

  </div>
</body>
</html>`;
}
