import type { MetricName, ToolCardData } from "../../../types/tool-grid";

interface ResourceBarChartProps {
  tools: ToolCardData[];
  selectedMetric: MetricName;
  onSelectMetric: (metric: MetricName) => void;
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

export function ResourceBarChart({ tools, selectedMetric, onSelectMetric }: ResourceBarChartProps) {
  const completed = tools
    .filter((t) => COMPLETED_STATUSES.has(t.status))
    .map((t) => ({ tool: t, value: getMetricValue(t, selectedMetric) }))
    .sort((a, b) => b.value - a.value);

  const maxValue = completed.length > 0 ? Math.max(...completed.map((c) => c.value)) : 0;

  return (
    <div className="resource-bar-chart" role="figure" aria-label="Resource usage chart">
      <div className="chart-metric-tabs" role="tablist" aria-label="Metric selection">
        {METRIC_TABS.map((tab) => (
          <button
            key={tab.metric}
            className={`metric-tab${selectedMetric === tab.metric ? ` metric-active-${tab.metric}` : ""}`}
            onClick={() => onSelectMetric(tab.metric)}
            role="tab"
            aria-selected={selectedMetric === tab.metric}
            tabIndex={0}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="chart-bars" role="list" aria-label="Tool resource comparison">
        {completed.length === 0 ? (
          <div className="chart-no-data no-data" role="listitem" aria-label="No completed tools">
            No completed tools
          </div>
        ) : (
          completed.map(({ tool, value }) => {
            const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 100;
            const label = selectedMetric === "duration" ? formatDuration(value) : formatBytes(value);
            return (
              <div
                key={tool.toolId}
                className="tool-chart-row"
                data-tool-id={tool.toolId}
                role="listitem"
                aria-label={`${tool.toolName}: ${label}`}
              >
                <span className="tool-chart-name">{tool.toolName}</span>
                <span className="tool-chart-bar-wrap">
                  <span className={`tool-chart-bar ${statusColorClass(tool.status)}`} style={{ width: `${pct}%` }} />
                </span>
                <span className="tool-chart-value">{label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
