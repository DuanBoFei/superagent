import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const DEFAULT_ENDPOINT = "https://api.search.local/query";
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 50_000;
const DDG_URL = "https://html.duckduckgo.com/html/";

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

  if (apiKey) {
    return customSearch(query, apiKey);
  }

  return builtinSearch(query);
}

async function customSearch(
  query: string,
  apiKey: string,
): Promise<ToolResult> {
  const endpoint =
    process.env.SUPERAGENT_WEBSEARCH_ENDPOINT ?? DEFAULT_ENDPOINT;
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
    return formatOutput(results);
  } catch {
    return unavailable("request failed");
  } finally {
    clearTimeout(timeout);
  }
}

async function builtinSearch(query: string): Promise<ToolResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${DDG_URL}?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "user-agent": "SuperAgent/1.0" },
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailable("request failed");
    }

    const html = await response.text();
    const results = parseDuckDuckGoHtml(html);
    if (results.length === 0) {
      return { output: "No results found.", metadata: { results: [], note: undefined } };
    }
    return formatOutput(results);
  } catch {
    return unavailable("request failed");
  } finally {
    clearTimeout(timeout);
  }
}

function parseDuckDuckGoHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const resultRegex =
    /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = resultRegex.exec(html)) !== null) {
    const rawUrl = match[1] ?? "";
    const title = stripHtml(match[2] ?? "").trim();
    const snippet = stripHtml(match[3] ?? "").trim();

    if (!rawUrl) continue;
    const url = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;

    if (title && url) {
      results.push({ title, url, snippet });
    }
  }

  return results;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
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

function formatOutput(results: SearchResult[]): ToolResult {
  const formatted = results
    .map((result) => `${result.title}\n${result.url}\n${result.snippet}`)
    .join("\n\n");

  if (Buffer.byteLength(formatted, "utf8") <= MAX_OUTPUT_BYTES) {
    return {
      output: formatted,
      metadata: { results, note: undefined },
    };
  }

  let truncated = "";
  for (let i = 0; i < results.length; i++) {
    const entry = results[i];
    if (!entry) break;
    const block = `${entry.title}\n${entry.url}\n${entry.snippet}`;
    const next =
      truncated.length === 0 ? block : `${truncated}\n\n${block}`;
    if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
      truncated += `\n\n[...truncated ${results.length - i} results]`;
      break;
    }
    truncated = next;
  }

  return {
    output: truncated,
    metadata: {
      results,
      note: `truncated to ${MAX_OUTPUT_BYTES / 1000}KB`,
    },
  };
}

function unavailable(note: string): ToolResult {
  return {
    output: `Search unavailable: ${note}`,
    metadata: { results: [], note },
  };
}
