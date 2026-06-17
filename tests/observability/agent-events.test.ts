import { describe, expect, expectTypeOf, it } from "vitest";
import type { LogEvent } from "../../src/observability/types";

describe("multi-agent observability events", () => {
  it("models phase lifecycle events", () => {
    const event: LogEvent = {
      type: "agent:phase",
      runId: "run-020",
      role: "explore",
      lifecycle: "start",
    };

    expect(event).toEqual({
      type: "agent:phase",
      runId: "run-020",
      role: "explore",
      lifecycle: "start",
    });
    expectTypeOf(event).toMatchTypeOf<LogEvent>();
  });
});
