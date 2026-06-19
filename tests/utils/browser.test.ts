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

  it.each([
    ["darwin", "open", ["http://localhost:3456"], undefined],
    ["win32", "start", ["", "http://localhost:3456"], true],
    ["linux", "xdg-open", ["http://localhost:3456"], undefined],
  ] as const)("uses the %s platform opener", async (platform, command, args, shell) => {
    const calls: unknown[] = [];
    const result = await openBrowser("http://localhost:3456", {
      env: {},
      platform,
      spawn: ((receivedCommand: string, receivedArgs: string[], options: unknown) => {
        calls.push([receivedCommand, receivedArgs, options]);
        const child = new EventEmitter() as any;
        child.unref = () => undefined;
        queueMicrotask(() => child.emit("spawn"));
        return child;
      }) as any,
    });

    expect(result).toEqual({ opened: true, skipped: false });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject([command, args, { shell }]);
  });
});
