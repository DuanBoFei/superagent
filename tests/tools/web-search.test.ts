import { afterEach, describe, expect, it, vi } from "vitest";
import { webSearchTool } from "../../src/tools/web-search";
import type { ToolContext } from "../../src/tools/types";

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: (_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null, stdout: string, stderr: string) => void) => {
    mockExecFile().then(
      (result: { stdout?: string; stderr?: string } | undefined) => cb(null, result?.stdout ?? "", result?.stderr ?? ""),
      (err: Error) => cb(err, "", ""),
    );
  },
}));

const context: ToolContext = {
  workingDirectory: process.cwd(),
  sessionId: "test-session",
};

function mockDdgHtml(title: string, url: string, snippet: string): string {
  return `<!DOCTYPE html><html><body>
  <div class="result">
    <a class="result__a" href="${url}">${title}</a>
    <a class="result__snippet">${snippet}</a>
  </div>
  </body></html>`;
}

function mockDdgMultiHtml(
  items: { title: string; url: string; snippet: string }[],
): string {
  const blocks = items
    .map(
      (item) =>
        `<div class="result"><a class="result__a" href="${item.url}">${item.title}</a><a class="result__snippet">${item.snippet}</a></div>`,
    )
    .join("\n");
  return `<!DOCTYPE html><html><body>${blocks}</body></html>`;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  mockExecFile.mockReset();
});

describe("WebSearch tool", () => {
  // ---- Existing custom-endpoint tests (unchanged behavior) ----

  it("posts a query to the configured endpoint and returns search results", async () => {
    vi.stubEnv("SUPERAGENT_WEBSEARCH_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_WEBSEARCH_ENDPOINT", "https://search.example.test/query");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            results: [
              { title: "Docs", url: "https://example.test/docs", snippet: "API reference" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await webSearchTool({ query: "api docs" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toBe("Docs\nhttps://example.test/docs\nAPI reference");
    expect(result.metadata).toMatchObject({
      results: [{ title: "Docs", url: "https://example.test/docs", snippet: "API reference" }],
      note: undefined,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://search.example.test/query",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer test-key" }),
        body: JSON.stringify({ query: "api docs" }),
      }),
    );
  });

  it("returns empty results with a note when no API key is configured (falls back to built-in, which fails gracefully)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("server error", { status: 500 })),
    );

    const result = await webSearchTool({ query: "api docs" }, context);

    expect(result.output).toBe("Search unavailable: request failed");
    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({ results: [], note: "request failed" });
  });

  it("returns empty results with a note when the request fails", async () => {
    vi.stubEnv("SUPERAGENT_WEBSEARCH_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_WEBSEARCH_ENDPOINT", "https://search.example.test/query");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("server error", { status: 500 })),
    );

    const result = await webSearchTool({ query: "api docs" }, context);

    expect(result.output).toBe("Search unavailable: request failed");
    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({ results: [], note: "request failed" });
  });

  it("rejects an empty query", async () => {
    const result = await webSearchTool({ query: "   " }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("query must not be empty");
  });

  it("returns graceful degradation when fetch exceeds timeout", async () => {
    vi.stubEnv("SUPERAGENT_WEBSEARCH_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_WEBSEARCH_ENDPOINT", "https://search.example.test/query");

    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options) => {
        return new Promise((_resolve, reject) => {
          const signal = options?.signal as AbortSignal | undefined;
          if (signal?.aborted) {
            reject(new Error("Aborted"));
            return;
          }
          const onAbort = () => {
            signal?.removeEventListener("abort", onAbort);
            reject(new Error("Aborted"));
          };
          signal?.addEventListener("abort", onAbort);
        });
      }),
    );

    const resultPromise = webSearchTool({ query: "timeout test" }, context);

    await vi.advanceTimersByTimeAsync(35_000);

    const result = await resultPromise;

    expect(result.output).toBe("Search unavailable: request failed");
    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({ results: [], note: "request failed" });
  });

  // ---- New: built-in DuckDuckGo provider tests ----

  it("uses built-in DuckDuckGo provider when no API key is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (typeof url === "string" && url.includes("duckduckgo.com")) {
          return new Response(
            mockDdgHtml("TypeScript Docs", "https://typescriptlang.org/docs", "Official docs"),
            { status: 200, headers: { "content-type": "text/html" } },
          );
        }
        return new Response("unexpected", { status: 500 });
      }),
    );

    const result = await webSearchTool({ query: "typescript" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toContain("TypeScript Docs");
    expect(result.output).toContain("https://typescriptlang.org/docs");
    expect(result.output).toContain("Official docs");
    expect(result.metadata).toMatchObject({
      results: [{ title: "TypeScript Docs", url: "https://typescriptlang.org/docs", snippet: "Official docs" }],
      note: undefined,
    });
  });

  it("returns multiple results from DuckDuckGo HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          mockDdgMultiHtml([
            { title: "Result A", url: "https://a.example.com", snippet: "Snippet A" },
            { title: "Result B", url: "https://b.example.com", snippet: "Snippet B" },
          ]),
          { status: 200, headers: { "content-type": "text/html" } },
        ),
      ),
    );

    const result = await webSearchTool({ query: "test" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toContain("Result A");
    expect(result.output).toContain("Result B");
    expect(result.metadata).toMatchObject({
      results: [
        { title: "Result A", url: "https://a.example.com", snippet: "Snippet A" },
        { title: "Result B", url: "https://b.example.com", snippet: "Snippet B" },
      ],
      note: undefined,
    });
  });

  it("returns no results when DuckDuckGo HTML has no matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<html><body>No results found</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    const result = await webSearchTool({ query: "xyznonexistent12345" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toBe("No results found.");
  });

  it("gracefully degrades when DuckDuckGo fetch fails with network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    mockExecFile.mockRejectedValue(new Error("curl not available"));

    const result = await webSearchTool({ query: "test" }, context);

    expect(result.output).toBe("Search unavailable: network error connecting to search provider. If you are behind a firewall or proxy, set SUPERAGENT_WEBSEARCH_API_KEY to use a custom search endpoint.");
    expect(result.error).toBe("network error");
  });

  it("gracefully degrades when DuckDuckGo returns HTTP 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate limited", { status: 429 })),
    );

    const result = await webSearchTool({ query: "test" }, context);

    expect(result.output).toBe("Search unavailable: request failed");
    expect(result.error).toBeUndefined();
  });

  // ---- New: truncation tests ----

  it("truncates output at 50KB with a note", async () => {
    vi.stubEnv("SUPERAGENT_WEBSEARCH_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_WEBSEARCH_ENDPOINT", "https://search.example.test/query");

    const largeResults = Array.from({ length: 500 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.test/${i}`,
      snippet: "x".repeat(200),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ results: largeResults }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const result = await webSearchTool({ query: "large" }, context);

    expect(result.error).toBeUndefined();
    const byteLength = Buffer.byteLength(result.output, "utf8");
    expect(byteLength).toBeLessThanOrEqual(55_000);
    expect(result.output).toContain("truncated");
    expect(result.metadata).toMatchObject({ note: "truncated to 50KB" });
  });

  it("does not truncate small results", async () => {
    vi.stubEnv("SUPERAGENT_WEBSEARCH_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_WEBSEARCH_ENDPOINT", "https://search.example.test/query");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            results: [{ title: "One", url: "https://example.test", snippet: "short" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await webSearchTool({ query: "small" }, context);

    expect(result.output).not.toContain("truncated");
    expect(result.metadata).toMatchObject({ note: undefined });
  });

  // ---- New: priority test ----

  it("uses custom endpoint when API key is set (skips built-in)", async () => {
    vi.stubEnv("SUPERAGENT_WEBSEARCH_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_WEBSEARCH_ENDPOINT", "https://search.example.test/query");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (typeof url === "string" && url.includes("duckduckgo.com")) {
          return new Response("should not be called", { status: 500 });
        }
        return new Response(
          JSON.stringify({
            results: [{ title: "Custom", url: "https://custom.test", snippet: "From custom API" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const result = await webSearchTool({ query: "test" }, context);

    expect(result.output).toContain("Custom");
    expect(result.output).toContain("From custom API");
    // DuckDuckGo was never called because API key gates the built-in path
  });

  // ---- New: built-in timeout ----

  it("returns unavailable when built-in search times out", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options) => {
        return new Promise((_resolve, reject) => {
          const signal = options?.signal as AbortSignal | undefined;
          if (signal?.aborted) {
            reject(new Error("Aborted"));
            return;
          }
          const onAbort = () => {
            signal?.removeEventListener("abort", onAbort);
            reject(new Error("Aborted"));
          };
          signal?.addEventListener("abort", onAbort);
        });
      }),
    );
    mockExecFile.mockRejectedValue(new Error("curl not available"));

    const resultPromise = webSearchTool({ query: "timeout" }, context);

    await vi.advanceTimersByTimeAsync(35_000);

    const result = await resultPromise;

    expect(result.output).toBe("Search unavailable: network error connecting to search provider. If you are behind a firewall or proxy, set SUPERAGENT_WEBSEARCH_API_KEY to use a custom search endpoint.");
    expect(result.error).toBe("network error");
  });
});
