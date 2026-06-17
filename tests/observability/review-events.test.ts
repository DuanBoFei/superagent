import { describe, expect, expectTypeOf, it } from "vitest";
import type { LogEvent } from "../../src/observability/types";

describe("code review observability events", () => {
  it("models review start and end events", () => {
    const start: LogEvent = {
      type: "review:start",
      runId: "run-021",
    };
    const end: LogEvent = {
      type: "review:end",
      runId: "run-021",
      approved: false,
      findingCount: 1,
    };

    expect(start).toEqual({ type: "review:start", runId: "run-021" });
    expect(end).toEqual({
      type: "review:end",
      runId: "run-021",
      approved: false,
      findingCount: 1,
    });
    expectTypeOf(start).toMatchTypeOf<LogEvent>();
    expectTypeOf(end).toMatchTypeOf<LogEvent>();
  });
});
