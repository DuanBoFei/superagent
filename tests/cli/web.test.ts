import { afterEach, describe, expect, it, vi } from "vitest";
import { startWebCommand, type WebCommandServer } from "../../src/cli/web";
import { WebLogger } from "../../src/server/logger";

function createLogger(output: string[]) {
  return new WebLogger({ color: false, verbose: true, write: (line) => output.push(line) });
}

describe("startWebCommand", () => {
  afterEach(() => {
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("starts the server with web options and skips browser opening", async () => {
    const output: string[] = [];
    let receivedPort = 0;
    let openCalled = false;
    const server: WebCommandServer = {
      start: async () => ({ host: "127.0.0.1", port: 4567, url: "http://localhost:4567", pid: 123 }),
      shutdown: async () => undefined,
    };

    const result = await startWebCommand({
      port: 4567,
      verbose: true,
      noOpen: true,
      noFrontend: true,
      logger: createLogger(output),
      createServer: (options) => {
        receivedPort = options.port;
        return server;
      },
      open: async () => {
        openCalled = true;
        return { opened: true, skipped: false };
      },
    });

    expect(result).toBe(0);
    expect(receivedPort).toBe(4567);
    expect(openCalled).toBe(false);
    expect(output.join("\n")).toContain("Backend server started at http://localhost:4567");
    expect(output.join("\n")).toContain("Open http://localhost:4567 in your browser");
  });

  it("prints a manual URL hint when browser launch fails", async () => {
    const output: string[] = [];
    const result = await startWebCommand({
      noFrontend: true,
      logger: createLogger(output),
      createServer: () => ({
        start: async () => ({ host: "127.0.0.1", port: 3456, url: "http://localhost:3456", pid: 123 }),
        shutdown: async () => undefined,
      }),
      open: async () => ({ opened: false, skipped: false, error: "missing opener" }),
    });

    expect(result).toBe(0);
    expect(output.join("\n")).toContain("Browser did not open automatically");
    expect(output.join("\n")).toContain("Browser open failed: missing opener");
  });

  it("writes a controlled startup error and returns failure", async () => {
    const output: string[] = [];

    const result = await startWebCommand({
      logger: createLogger(output),
      createServer: () => ({
        start: async () => {
          throw new Error("port unavailable");
        },
        shutdown: async () => undefined,
      }),
    });

    expect(result).toBe(1);
    expect(output.join("\n")).toContain("Failed to start web server: port unavailable");
  });

  it("waits for SIGINT and shuts down the server", async () => {
    const output: string[] = [];
    const shutdown = vi.fn(async () => undefined);

    const command = startWebCommand({
      noOpen: true,
      waitForSignal: true,
      logger: createLogger(output),
      createServer: () => ({
        start: async () => ({ host: "127.0.0.1", port: 3456, url: "http://localhost:3456", pid: 123 }),
        shutdown,
      }),
    });

    await vi.waitFor(() => expect(process.listenerCount("SIGINT")).toBeGreaterThan(0));
    process.emit("SIGINT");

    await expect(command).resolves.toBe(0);
    expect(shutdown).toHaveBeenCalledWith(1000);
    expect(output.join("\n")).toContain("Web server stopped");
  });
});
