import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const DEFAULT_ENDPOINT = "https://api.search.local/query";
const TIMEOUT_MS = 30_000;

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export const webSearchToolSchema = z.object({
  query: z.string(),
});

export async function webSearchTool(
  args: Record<string, unknown>,
  _context: ToolContext,
): Promise<ToolResult> {
  const parsed = webSearchToolSchema.safeParse(args);
  if (!parsed.success) {
    return { output: "", error: parsed.error.message };
  }

  const query = parsed.data.query;
  if (query.trim().length === 0) {
    return { output: "", error: "query must not be empty" };
  }

  const apiKey = process.env.SUPERAGENT_WEBSEARCH_API_KEY;
  if (!apiKey) {
    return unavailable("missing API key");
  }

  const endpoint = process.env.SUPERAGENT_WEBSEARCH_ENDPOINT ?? DEFAULT_ENDPOINT;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailable("request failed");
    }

    const body = await response.json();
    const results = parseResults(body);
    return {
      output: formatResults(results),
      metadata: { results, note: undefined },
    };
  } catch {
    return unavailable("request failed");
  } finally {
    clearTimeout(timeout);
  }
}

function parseResults(body: unknown): SearchResult[] {
  const results = z
    .object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          snippet: z.string(),
        }),
      ),
    })
    .safeParse(body);

  return results.success ? results.data.results : [];
}

function formatResults(results: SearchResult[]): string {
  return results
    .map((result) => `${result.title}\n${result.url}\n${result.snippet}`)
    .join("\n\n");
}

function unavailable(note: string): ToolResult {
  return {
    output: `Search unavailable: ${note}`,
    metadata: { results: [], note },
  };
}
