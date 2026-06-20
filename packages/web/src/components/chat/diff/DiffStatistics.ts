import type { DiffStatistics as DiffStats } from "../../../types/diff";

export function renderDiffStatistics(stats: DiffStats): string {
  const items = [
    { label: "Added", value: `+${stats.linesAdded}`, color: "text-emerald-400" },
    { label: "Deleted", value: `-${stats.linesDeleted}`, color: "text-red-400" },
    { label: "Modified", value: `*${stats.linesModified}`, color: "text-amber-400" },
    { label: "Blocks", value: `${stats.changeBlocks}`, color: "text-neutral-400" },
  ];

  const statItems = items
    .map(
      (item) =>
        `<span class="diff-stat-item flex items-center gap-1 text-xs font-mono">
          <span class="diff-stat-label text-neutral-500">${item.label}:</span>
          <span class="diff-stat-value ${item.color} font-medium">${item.value}</span>
        </span>`,
    )
    .join("\n");

  return `<div class="diff-statistics flex items-center gap-3 px-3 py-2 bg-neutral-900 border-b border-neutral-800 rounded-t" aria-label="Diff statistics">
    ${statItems}
    <span class="diff-stat-total text-xs text-neutral-600 ml-auto">${stats.totalLines} lines</span>
  </div>`;
}
