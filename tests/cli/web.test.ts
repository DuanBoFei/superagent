import { describe, expect, it, vi } from "vitest";
import { startWebCommand } from "../../src/cli/web";

describe("startWebCommand", () => {
  it("accepts web command options and returns success for the skeleton", async () => {
    const result = await startWebCommand({
      port: 3456,
      verbose: true,
      noOpen: true,
    });

    expect(result).toBe(0);
  });

  it("writes a controlled startup error and returns failure", async () => {
    let stderr = "";
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: any) => {
      stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      return true;
    });

    const result = await startWebCommand({
      start: async () => {
        throw new Error("port unavailable");
      },
    });

    expect(result).toBe(1);
    expect(stderr).toContain("Failed to start web server: port unavailable");
  });
});
