import { describe, expect, it } from "vitest";
import { renderTaskListCard } from "../../packages/web/src/components/chat/cards/TaskListCard";
import type { TaskListCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<TaskListCard> = {}): TaskListCard {
  return {
    id: "t1", type: "task-list", status: "success", timestamp: 1_720_000_000_000,
    title: "Task Progress", isExpanded: true, isCollapsible: false,
    content: {
      tasks: [
        { taskId: "1", title: "Read project structure", status: "completed" },
        { taskId: "2", title: "Implement auth module", status: "in-progress" },
        { taskId: "3", title: "Write tests", status: "pending" },
      ],
      completedCount: 1, totalCount: 3,
    },
    ...overrides,
  } as TaskListCard;
}

describe("renderTaskListCard", () => {
  it("displays progress bar with completion stats", () => {
    const html = renderTaskListCard(card());
    expect(html).toContain("1/3");
    expect(html).toContain("width:33%");
  });

  it("renders task titles", () => {
    const html = renderTaskListCard(card());
    expect(html).toContain("Read project structure");
    expect(html).toContain("Implement auth module");
    expect(html).toContain("Write tests");
  });

  it("shows completed tasks with strikethrough", () => {
    const html = renderTaskListCard(card());
    expect(html).toContain("line-through");
  });

  it("shows 100% progress when all done", () => {
    const allDone = card({
      content: {
        tasks: [{ taskId: "1", title: "Done", status: "completed" }],
        completedCount: 1, totalCount: 1,
      },
    });
    const html = renderTaskListCard(allDone);
    expect(html).toContain("width:100%");
  });
});
