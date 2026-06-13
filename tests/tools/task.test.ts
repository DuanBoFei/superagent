import { beforeEach, describe, expect, it } from "vitest";
import { resetTasks, taskTool } from "../../src/tools/task";
import type { ToolContext } from "../../src/tools/types";

const context: ToolContext = {
  workingDirectory: process.cwd(),
  sessionId: "test-session",
};

beforeEach(() => {
  resetTasks();
});

describe("Task tool", () => {
  it("creates a task with an auto-assigned id", async () => {
    const result = await taskTool(
      { subject: "Write tests", description: "Cover task behavior" },
      context,
    );

    expect(result.error).toBeUndefined();
    expect(result.output).toContain("1. [pending] Write tests");
    expect(result.metadata).toMatchObject({ count: 1 });
  });

  it("updates an existing task", async () => {
    await taskTool({ subject: "Write tests" }, context);

    const result = await taskTool(
      { taskId: "1", subject: "Write more tests", status: "in_progress" },
      context,
    );

    expect(result.output).toContain("1. [in_progress] Write more tests");
  });

  it("marks a task completed", async () => {
    await taskTool({ subject: "Implement tool" }, context);

    const result = await taskTool({ taskId: "1", status: "completed" }, context);

    expect(result.output).toContain("1. [completed] Implement tool");
  });

  it("lists existing tasks without creating a new one", async () => {
    await taskTool({ subject: "One" }, context);
    await taskTool({ subject: "Two" }, context);

    const result = await taskTool({ operation: "list" }, context);

    expect(result.output).toBe("1. [pending] One\n2. [pending] Two");
    expect(result.metadata).toMatchObject({ count: 2 });
  });

  it("returns an error for missing task ids", async () => {
    const result = await taskTool({ taskId: "404", status: "completed" }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("Task not found: 404");
  });

  it("warns when more than 20 tasks exist", async () => {
    for (let index = 0; index < 21; index++) {
      await taskTool({ subject: `Task ${index + 1}` }, context);
    }

    const result = await taskTool({ operation: "list" }, context);

    expect(result.output).toContain("Too many tasks (21). Consider merging.");
    expect(result.metadata).toMatchObject({ count: 21, warning: true });
  });
});
