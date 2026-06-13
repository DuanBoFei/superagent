import type { TaskItem, TerminalConfig } from "./types";
import { stringWidth } from "./wcwidth";

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
  const PREFIX_W = 5; // "  [X] "

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

    const subject = truncateSubject(task.subject, width - PREFIX_W);
    process.stdout.write(`  [${style}${icon}${RESET}] ${subject}\n`);
  }

  if (tasks.length > 20) {
    process.stdout.write(
      DIM + `  ... and ${tasks.length - 20} more tasks` + RESET + "\n",
    );
  }
}

function truncateSubject(s: string, maxWidth: number): string {
  if (stringWidth(s) <= maxWidth) return s;
  let w = 0;
  let idx = 0;
  for (const cp of [...s]) {
    const cw = stringWidth(cp);
    if (w + cw > maxWidth - 3) break;
    w += cw;
    idx += cp.length;
  }
  return s.slice(0, idx) + "...";
}
