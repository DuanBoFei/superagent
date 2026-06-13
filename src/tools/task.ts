import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const taskStatusSchema = z.enum(["pending", "in_progress", "completed"]);

export const taskToolSchema = z.object({
  operation: z.enum(["create", "update", "list"]).optional(),
  taskId: z.string().optional(),
  subject: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatusSchema.optional(),
});

type TaskStatus = z.infer<typeof taskStatusSchema>;

interface TaskItem {
  id: string;
  subject: string;
  description?: string;
  status: TaskStatus;
}

let tasks: TaskItem[] = [];
let nextId = 1;

export function resetTasks(): void {
  tasks = [];
  nextId = 1;
}

export async function taskTool(
  args: Record<string, unknown>,
  _context: ToolContext,
): Promise<ToolResult> {
  const parsed = taskToolSchema.safeParse(args);
  if (!parsed.success) {
    return { output: "", error: parsed.error.message };
  }

  const operation = parsed.data.operation ?? (parsed.data.taskId ? "update" : "create");

  if (operation === "list") {
    return result();
  }

  if (operation === "create") {
    if (!parsed.data.subject) {
      return { output: "", error: "subject is required" };
    }

    tasks.push({
      id: String(nextId++),
      subject: parsed.data.subject,
      description: parsed.data.description,
      status: parsed.data.status ?? "pending",
    });
    return result();
  }

  if (!parsed.data.taskId) {
    return { output: "", error: "taskId is required" };
  }

  const task = tasks.find((candidate) => candidate.id === parsed.data.taskId);
  if (!task) {
    return { output: "", error: `Task not found: ${parsed.data.taskId}` };
  }

  if (parsed.data.subject) {
    task.subject = parsed.data.subject;
  }
  if (parsed.data.description !== undefined) {
    task.description = parsed.data.description;
  }
  if (parsed.data.status) {
    task.status = parsed.data.status;
  }

  return result();
}

function result(): ToolResult {
  const warning = tasks.length > 20 ? `\nToo many tasks (${tasks.length}). Consider merging.` : "";
  return {
    output: `${formatTasks()}${warning}`,
    metadata: {
      tasks: tasks.map((task) => ({ ...task })),
      count: tasks.length,
      warning: tasks.length > 20,
    },
  };
}

function formatTasks(): string {
  return tasks
    .map((task) => `${task.id}. [${task.status}] ${task.subject}`)
    .join("\n");
}
