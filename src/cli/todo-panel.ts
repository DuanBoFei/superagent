import type { TaskItem, TerminalConfig } from "./types";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

export function renderTodoPanel(
  tasks: TaskItem[],
  config: TerminalConfig,
): void {
  if (tasks.length === 0) return;

  const width = config.width > 0 ? config.width : 80;

  process.stdout.write(`\n${BOLD}Tasks${RESET}\n`);

  for (const task of tasks.slice(0, 20)) {
    let icon: string;
    let style: string;
    switch (task.status) {
      case "completed":
        icon = "✓";
        style = GREEN;
        break;
      case "in_progress":
        icon = "~";
        style = YELLOW;
        break;
      default:
        icon = " ";
        style = DIM;
        break;
    }

    const line = `  [${style}${icon}${RESET}] ${task.subject}`;
    const truncated =
      line.length > width ? line.slice(0, width - 3) + "..." : line;
    process.stdout.write(`${truncated}\n`);
  }

  if (tasks.length > 20) {
    process.stdout.write(
      DIM + `  ... and ${tasks.length - 20} more tasks` + RESET + "\n",
    );
  }
}
