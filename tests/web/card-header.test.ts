import { describe, expect, it } from "vitest";
import { renderCardHeader } from "../../packages/web/src/components/chat/cards/CardHeader";
import type { BaseCardState } from "../../packages/web/src/types/cards";

function makeBase(overrides: Partial<BaseCardState> = {}): BaseCardState {
  return {
    id: "h1",
    type: "bash",
    status: "running",
    timestamp: 1_720_000_000_000,
    title: "npm test",
    isExpanded: true,
    isCollapsible: true,
    ...overrides,
  };
}

describe("renderCardHeader", () => {
  it("renders the card title", () => {
    const html = renderCardHeader(makeBase({ title: "install deps" }));
    expect(html).toContain("install deps");
  });

  it("includes the card id as a data attribute", () => {
    const html = renderCardHeader(makeBase({ id: "tc_42" }));
    expect(html).toContain('data-card-id="tc_42"');
  });

  it("renders a status indicator for each status", () => {
    const statuses = ["pending", "running", "success", "error"] as const;
    for (const status of statuses) {
      const html = renderCardHeader(makeBase({ status }));
      expect(html).toContain(`data-status="${status}"`);
    }
  });

  it("renders a human-readable tool type label", () => {
    const pairs: Record<string, string> = {
      bash: "Bash",
      "file-read": "File Read",
      "file-write": "File Write",
      "file-edit": "File Edit",
      grep: "Grep",
      glob: "Glob",
      "task-list": "Task List",
      "sub-agent-grid": "Sub-Agents",
      "web-search": "Web Search",
    };
    for (const [type, label] of Object.entries(pairs)) {
      const html = renderCardHeader(makeBase({ type: type as BaseCardState["type"] }));
      expect(html).toContain(label);
    }
  });

  it("renders a copy button with data-action", () => {
    const html = renderCardHeader(makeBase());
    expect(html).toContain('data-action="copy-card"');
  });

  it("renders an expand/collapse toggle when collapsible", () => {
    const expanded = renderCardHeader(makeBase({ isExpanded: true, isCollapsible: true }));
    expect(expanded).toContain('data-action="toggle-card"');
    expect(expanded).toContain('aria-expanded="true"');

    const collapsed = renderCardHeader(makeBase({ isExpanded: false, isCollapsible: true }));
    expect(collapsed).toContain('aria-expanded="false"');
  });

  it("omits the toggle when isCollapsible is false", () => {
    const html = renderCardHeader(makeBase({ isCollapsible: false }));
    expect(html).not.toContain('data-action="toggle-card"');
  });

  it("escapes HTML in the title", () => {
    const html = renderCardHeader(makeBase({ title: '<script>alert("xss")</script>' }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("formats the timestamp as ISO", () => {
    const html = renderCardHeader(makeBase({ timestamp: 1_720_000_000_000 }));
    // ISO format: 2024-07-03
    expect(html).toContain("2024");
  });
});
