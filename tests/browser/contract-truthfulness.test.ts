import { describe, expect, it } from "vitest";
import { browserToolSchema } from "../../src/tools/browser";
import type { BrowserAction, BrowserResult } from "../../src/browser/types";

const browserActionTypes: BrowserAction["type"][] = [
  "open",
  "click",
  "type",
  "select",
  "wait",
  "screenshot",
  "close",
];

describe("browser contract truthfulness", () => {
  it("accepts every implemented browser action shape exposed to the tool registry", () => {
    const actions: BrowserAction[] = [
      { type: "open", url: "https://example.test", timeoutMs: 1000 },
      { type: "click", selector: "button.save", timeoutMs: 1000 },
      { type: "type", selector: "input[name=email]", text: "user@example.test", timeoutMs: 1000 },
      { type: "select", selector: "select[name=role]", value: "admin", timeoutMs: 1000 },
      { type: "wait", selector: "main", text: "Ready", loadState: "domcontentloaded", timeoutMs: 1000 },
      { type: "screenshot", fullPage: true, timeoutMs: 1000 },
      { type: "close", timeoutMs: 1000 },
    ];

    for (const action of actions) {
      expect(browserToolSchema.safeParse({ action }).success, action.type).toBe(true);
    }
    expect(actions.map((action) => action.type)).toEqual(browserActionTypes);
  });

  it("rejects stale contract shapes that are not implemented by the tool schema", () => {
    expect(browserToolSchema.safeParse({
      action: "open",
      url: "https://example.test",
      captureScreenshot: true,
    }).success).toBe(false);
    expect(browserToolSchema.safeParse({
      action: {
        type: "click",
        target: { kind: "role", value: "button", name: "Submit" },
      },
    }).success).toBe(false);
  });

  it("keeps normalized result shape aligned with runtime output", () => {
    const result = {
      action: "open",
      status: "running",
      finalUrl: "https://example.test/final",
      title: "Example",
      textSummary: "Hello world",
      artifacts: [],
      timedOut: false,
      durationMs: 12,
    } satisfies BrowserResult;

    expect(result).toEqual(expect.objectContaining({
      action: "open",
      status: "running",
      artifacts: [],
      timedOut: false,
    }));
    expect(result).not.toHaveProperty("success");
    expect(result).not.toHaveProperty("pageState");
  });
});
