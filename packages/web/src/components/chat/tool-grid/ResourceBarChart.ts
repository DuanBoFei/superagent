import type { MetricName, ToolCardData } from "../../../types/tool-grid";

export interface ResourceBarChartProps {
  tools: ToolCardData[];
  selectedMetric: MetricName;
}

const COMPLETED_STATUSES = new Set(["success", "failed", "cancelled"]);

const METRIC_TABS: { metric: MetricName; label: string }[] = [
  { metric: "duration", label: "Duration" },
  { metric: "outputSize", label: "Output Size" },
];

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0B";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getMetricValue(tool: ToolCardData, metric: MetricName): number {
  if (metric === "duration") return tool.durationMs ?? 0;
  if (metric === "outputSize") return tool.resourceUsage.outputBytes;
  return 0;
}

function statusColorClass(status: string): string {
  return `bar-color-${status}`;
}

export function renderResourceBarChart(props: ResourceBarChartProps): string {
  const { tools, selectedMetric } = props;

  const completed = tools
    .filter((t) => COMPLETED_STATUSES.has(t.status))
    .map((t) => ({ tool: t, value: getMetricValue(t, selectedMetric) }))
    .sort((a, b) => b.value - a.value);

  const maxValue = completed.length > 0 ? Math.max(...completed.map((c) => c.value)) : 0;

  const tabs = METRIC_TABS.map((tab) => {
    const activeClass = selectedMetric === tab.metric ? ` metric-active-${tab.metric}` : "";
    return `<button class="metric-tab${activeClass}" data-action="select-metric-${tab.metric}">${escapeHtml(tab.label)}</button>`;
  }).join("");

  let chartBody: string;
  if (completed.length === 0) {
    chartBody = `<div class="chart-no-data no-data">No completed tools</div>`;
  } else {
    const rows = completed.map(({ tool, value }) => {
      const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 100;
      const label = selectedMetric === "duration" ? formatDuration(value) : formatBytes(value);
      return `<div class="tool-chart-row" data-tool-id="${escapeAttr(tool.toolId)}">
        <span class="tool-chart-name">${escapeHtml(tool.toolName)}</span>
        <span class="tool-chart-bar-wrap">
          <span class="tool-chart-bar ${statusColorClass(tool.status)}" style="width:${pct}%"></span>
        </span>
        <span class="tool-chart-value">${escapeHtml(label)}</span>
      </div>`;
    }).join("");
    chartBody = rows;
  }

  return `<div class="resource-bar-chart">
  <div class="chart-metric-tabs">${tabs}</div>
  <div class="chart-bars">${chartBody}</div>
</div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
