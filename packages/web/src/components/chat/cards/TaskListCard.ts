import type { TaskListCard } from "../../../types/cards";

export function renderTaskListCard(card: TaskListCard): string {
  const { tasks, completedCount, totalCount } = card.content;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const progressBar = `<div class="task-progress flex items-center gap-2 mb-2">
    <div class="task-progress-bar flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
      <div class="task-progress-fill h-full bg-emerald-500 rounded-full transition-all duration-300" style="width:${pct}%"></div>
    </div>
    <span class="task-progress-text text-[11px] text-neutral-500 font-medium">${completedCount}/${totalCount}</span>
  </div>`;

  const taskRows = tasks.map((t) => {
    const icon = statusIcon(t.status);
    const rowClass = taskRowClass(t.status);
    return `<div class="task-row flex items-center gap-2 py-0.5 ${rowClass}">
      <span class="task-icon w-5 text-center">${icon}</span>
      <span class="task-title text-xs">${escapeHtml(t.title)}</span>
    </div>`;
  }).join("\n");

  return `<div class="task-list-card flex flex-col gap-1">
    ${progressBar}
    <div class="task-list flex flex-col bg-neutral-950 rounded border border-neutral-800 px-3 py-2">
      ${taskRows}
    </div>
  </div>`;
}

function statusIcon(status: string): string {
  switch (status) {
    case "completed":
      return `<span class="text-emerald-400">&#10003;</span>`;
    case "in-progress":
      return `<span class="text-amber-400 animate-spin inline-block">&#9696;</span>`;
    case "deleted":
      return `<span class="text-neutral-600">&#10005;</span>`;
    default:
      return `<span class="text-neutral-600">&#9675;</span>`;
  }
}

function taskRowClass(status: string): string {
  switch (status) {
    case "completed":
      return "text-neutral-500 line-through";
    case "in-progress":
      return "text-neutral-200";
    case "deleted":
      return "text-neutral-700 line-through";
    default:
      return "text-neutral-400";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
