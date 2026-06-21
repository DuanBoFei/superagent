import React from "react";
import type { TaskListCard as TaskListCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";

interface TaskListCardProps {
  card: TaskListCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function TaskListCard({ card, onToggle, onCopy }: TaskListCardProps) {
  const { tasks, completedCount, totalCount } = card.content;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="task-list-card flex flex-col gap-1">
        <div className="task-progress flex items-center gap-2 mb-2">
          <div className="task-progress-bar flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="task-progress-fill h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="task-progress-text text-[11px] text-neutral-500 font-medium">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="task-list flex flex-col bg-neutral-950 rounded border border-neutral-800 px-3 py-2">
          {tasks.map((t) => (
            <div key={t.taskId} className={`task-row flex items-center gap-2 py-0.5 ${taskRowClass(t.status)}`}>
              <span className="task-icon w-5 text-center">{statusIcon(t.status)}</span>
              <span className="task-title text-xs">{t.title}</span>
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  );
}

function statusIcon(status: string): React.ReactNode {
  switch (status) {
    case "completed":
      return <span className="text-emerald-400">&#10003;</span>;
    case "in-progress":
      return <span className="text-amber-400 animate-spin inline-block">&#9696;</span>;
    case "deleted":
      return <span className="text-neutral-600">&#10005;</span>;
    default:
      return <span className="text-neutral-600">&#9675;</span>;
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
