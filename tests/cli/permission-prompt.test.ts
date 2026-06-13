import { describe, expect, it, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { promptPermission } from "../../src/cli/permission-prompt";

describe("Permission Prompt", () => {
  let mockStdin: EventEmitter & { isTTY: boolean; isRaw: boolean; setRawMode: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockStdin = Object.assign(new EventEmitter(), {
      isTTY: true,
      isRaw: false,
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
    });
    vi.spyOn(process, "stdin", "get").mockReturnValue(mockStdin as unknown as typeof process.stdin);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  it("returns 'approved' when user presses Y", async () => {
    const promise = promptPermission("Bash", "npm test", 500);
    // Simulate keypress after microtask
    setTimeout(() => {
      mockStdin.emit("data", Buffer.from("y"));
    }, 10);
    const result = await promise;
    expect(result).toBe("approved");
  });

  it("returns 'denied' when user presses N", async () => {
    const promise = promptPermission("Bash", "rm file", 500);
    setTimeout(() => {
      mockStdin.emit("data", Buffer.from("n"));
    }, 10);
    const result = await promise;
    expect(result).toBe("denied");
  });

  it("returns 'always' when user presses A", async () => {
    const promise = promptPermission("Bash", "npm test", 500);
    setTimeout(() => {
      mockStdin.emit("data", Buffer.from("a"));
    }, 10);
    const result = await promise;
    expect(result).toBe("always");
  });

  it("returns 'denied' on timeout", async () => {
    const promise = promptPermission("Bash", "npm test", 100);
    const result = await promise;
    expect(result).toBe("denied");
  });

  it("returns 'denied' for non-TTY stdin", async () => {
    mockStdin.isTTY = false;
    const result = await promptPermission("Bash", "cmd", 100);
    expect(result).toBe("denied");
  });

  it("restores stdin raw mode after answer", async () => {
    const promise = promptPermission("Bash", "test", 500);
    setTimeout(() => {
      mockStdin.emit("data", Buffer.from("y"));
    }, 10);
    await promise;
    expect(mockStdin.setRawMode).toHaveBeenCalled();
  });
});
