import { afterEach, describe, expect, it, vi } from "vitest";
import { webSearchTool } from "../../src/tools/web-search";
import type { ToolContext } from "../../src/tools/types";

const context: ToolContext = {
  workingDirectory: process.cwd(),
  sessionId: "test-session",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("WebSearch tool", () => {
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

  it("returns empty results with a note when no API key is configured", async () => {
    const result = await webSearchTool({ query: "api docs" }, context);

    expect(result.output).toBe("Search unavailable: missing API key");
    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({ results: [], note: "missing API key" });
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
});
