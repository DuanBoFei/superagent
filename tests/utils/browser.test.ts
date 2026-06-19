import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { openBrowser } from "../../src/utils/browser";

describe("openBrowser", () => {
  it("skips browser launch in headless environments", async () => {
    const result = await openBrowser("http://localhost:3456", { env: { CI: "true" } });

    expect(result).toEqual({ opened: false, skipped: true });
  });

  it("returns failure instead of throwing when spawn fails", async () => {
    const result = await openBrowser("http://localhost:3456", {
      env: {},
      spawn: (() => {
        const child = new EventEmitter() as any;
        child.unref = () => undefined;
        queueMicrotask(() => child.emit("error", new Error("missing opener")));
        return child;
      }) as any,
    });

    expect(result.opened).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe("missing opener");
  });
});
