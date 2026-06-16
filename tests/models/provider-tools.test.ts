import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { sendMessage } from "../../src/models/provider";
import { buildModelToolDefinitions } from "../../src/models/tool-schema";
import { readToolSchema } from "../../src/tools/read";
import type { RegisteredTool, ToolRegistry } from "../../src/tools/types";
import type { ModelToolDefinition, Prompt, TokenChunk } from "../../src/models/types";

const readTool: ModelToolDefinition = {
  type: "function",
  function: {
    name: "Read",
    description: "Read a file",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string" },
      },
      required: ["file_path"],
      additionalProperties: false,
    },
  },
};

const prompt: Prompt = {
  system: "You are SuperAgent.",
  messages: [{ role: "user", content: "Read src/index.ts" }],
  tools: [readTool],
};

function sseResponse(): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

async function collect(): Promise<TokenChunk[]> {
  const chunks: TokenChunk[] = [];
  for await (const chunk of sendMessage(prompt)) {
    chunks.push(chunk);
  }
  return chunks;
}

function fakeTool(name: string, schema: z.ZodSchema): RegisteredTool {
  return {
    name,
    description: `${name} description`,
    fn: async () => ({ output: "" }),
    schema,
    concurrencySafe: true,
  };
}

describe("buildModelToolDefinitions", () => {
  it("generates model tool definitions in deterministic name order", () => {
    const registry: ToolRegistry = new Map([
      ["Write", fakeTool("Write", z.object({ content: z.string() }))],
      ["Read", fakeTool("Read", z.object({ file_path: z.string() }))],
    ]);

    const definitions = buildModelToolDefinitions(registry);

    expect(definitions.map((definition) => definition.function.name)).toEqual(["Read", "Write"]);
  });

  it("maps Read zod schema to JSON schema properties", () => {
    const registry: ToolRegistry = new Map([
      ["Read", fakeTool("Read", readToolSchema)],
    ]);

    expect(buildModelToolDefinitions(registry)).toEqual([
      {
        type: "function",
        function: {
          name: "Read",
          description: "Read description",
          parameters: {
            type: "object",
            properties: {
              file_path: { type: "string" },
              offset: { type: "number" },
              limit: { type: "number" },
            },
            required: ["file_path"],
            additionalProperties: false,
          },
        },
      },
    ]);
  });
});

describe("provider tool request body", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends tools and tool_choice auto when tools are available", async () => {
    vi.stubEnv("SUPERAGENT_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_BASE_URL", "https://api.example.test/v1");
    vi.stubEnv("SUPERAGENT_MODEL", "deepseek-v4-pro");
    vi.stubEnv("SUPERAGENT_FALLBACK_MODEL", "deepseek-v4-flash");

    const fetchMock = vi.fn().mockResolvedValue(sseResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(collect()).resolves.toEqual([{ type: "end" }]);

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "deepseek-v4-pro",
      stream: true,
      tools: [readTool],
      tool_choice: "auto",
    });
  });
});
