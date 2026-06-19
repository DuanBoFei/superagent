import { describe, expect, it } from "vitest";
import { WebLogger } from "../../src/server/logger";

describe("WebLogger", () => {
  it("writes levelled timestamped logs and buffers recent lines", () => {
    const output: string[] = [];
    const logger = new WebLogger({
      verbose: true,
      color: false,
      maxLines: 2,
      now: () => new Date("2026-06-19T12:00:00.000Z"),
      write: (line) => output.push(line),
    });

    logger.info("started");
    logger.debug("details");
    logger.warn("careful");

    expect(output[0]).toBe("[2026-06-19T12:00:00.000Z] INFO started");
    expect(output[1]).toBe("[2026-06-19T12:00:00.000Z] DEBUG details");
    expect(logger.lines()).toEqual([
      "[2026-06-19T12:00:00.000Z] DEBUG details",
      "[2026-06-19T12:00:00.000Z] WARN careful",
    ]);
  });

  it("suppresses debug logs unless verbose is enabled", () => {
    const output: string[] = [];
    const logger = new WebLogger({ color: false, write: (line) => output.push(line) });

    logger.debug("hidden");

    expect(output).toEqual([]);
  });
});
