import type { DiffStatistics as DiffStats } from "../../../types/diff";

interface DiffStatisticsProps {
  stats: DiffStats;
}

export function DiffStatistics({ stats }: DiffStatisticsProps) {
  const items = [
    { label: "Added", value: `+${stats.linesAdded}`, color: "text-emerald-400" },
    { label: "Deleted", value: `-${stats.linesDeleted}`, color: "text-red-400" },
    { label: "Modified", value: `*${stats.linesModified}`, color: "text-amber-400" },
    { label: "Blocks", value: `${stats.changeBlocks}`, color: "text-neutral-400" },
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-neutral-900 border-b border-neutral-800 rounded-t" aria-label="Diff statistics">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1 text-xs font-mono">
          <span className="text-neutral-500">{item.label}:</span>
          <span className={`${item.color} font-medium`}>{item.value}</span>
        </span>
      ))}
      <span className="text-xs text-neutral-600 ml-auto">{stats.totalLines} lines</span>
    </div>
  );
}
