import { describe, expect, it, vi } from "vitest";
import { runOneShot } from "../../src/cli/one-shot";
import type { RuntimeHandle } from "../../src/runtime/runtime";

function fakeRuntime(
  events: Array<{ type: string; content?: string; message?: string }>,
): RuntimeHandle {
  return {
    startTurn: vi.fn().mockImplementation(async function* () {
      for (const e of events) {
        yield e as any;
      }
    }),
    resumeSession: vi.fn(),
    cancel: vi.fn(),
  } as any;
}

function captureStreams() {
  let stdout = "";
  let stderr = "";
  const origStdout = process.stdout.write.bind(process.stdout);
  const origStderr = process.stderr.write.bind(process.stderr);

  vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: any) => {
      const s = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      stdout += s;
      return true;
    },
  );
  vi.spyOn(process.stderr, "write").mockImplementation(
    (chunk: any) => {
      const s = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      stderr += s;
      return true;
    },
  );

  return {
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    },
  };
}

describe("runOneShot", () => {
  it("writes text events to stdout", async () => {
    const rt = fakeRuntime([{ type: "text", content: "Hello from model" }]);
    const out = captureStreams();

    const result = await runOneShot(rt, "hi", "test-model", {
      emit: vi.fn(),
      close: vi.fn(),
    });

    expect(out.stdout).toContain("SuperAgent");
    expect(out.stdout).toContain("Hello from model");
    expect(result).toBe(0);
  });

  it("writes error events to stderr", async () => {
    const rt = fakeRuntime([
      { type: "error", message: "API key invalid" },
    ]);
    const out = captureStreams();

    const result = await runOneShot(rt, "hi", "test-model", {
      emit: vi.fn(),
      close: vi.fn(),
    });

    expect(out.stderr).toContain("API key invalid");
    expect(result).toBe(0);
  });

  it("emits session:end and calls close on success", async () => {
    const rt = fakeRuntime([{ type: "text", content: "ok" }]);
    const obs = { emit: vi.fn(), close: vi.fn() };

    captureStreams();
    const result = await runOneShot(rt, "hello", "test-model", obs);

    expect(obs.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "session:end" }),
    );
    expect(obs.close).toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it("returns 0 exit code even when runtime yields no events", async () => {
    const rt = fakeRuntime([]);
    captureStreams();

    const result = await runOneShot(rt, "empty", "test-model", {
      emit: vi.fn(),
      close: vi.fn(),
    });

    expect(result).toBe(0);
  });

  it("ends output with a newline", async () => {
    const rt = fakeRuntime([{ type: "text", content: "response" }]);
    const out = captureStreams();

    await runOneShot(rt, "prompt", "test-model", {
      emit: vi.fn(),
      close: vi.fn(),
    });

    expect(out.stdout).toMatch(/\n$/);
  });
});
