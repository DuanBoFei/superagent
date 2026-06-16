import { z } from "zod";
import { executeBrowserAction } from "../browser/actions";
import type { BrowserArtifactWriter } from "../browser/artifacts";
import { BrowserSessionManager } from "../browser/session";
import type { BrowserAction, BrowserProfile } from "../browser/types";
import type { ToolFunction, ToolResult } from "./types";

const browserActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open"), url: z.string().url(), timeoutMs: z.number().int().positive().optional() }),
  z.object({ type: z.literal("click"), selector: z.string().min(1), timeoutMs: z.number().int().positive().optional() }),
  z.object({ type: z.literal("type"), selector: z.string().min(1), text: z.string(), timeoutMs: z.number().int().positive().optional() }),
  z.object({ type: z.literal("select"), selector: z.string().min(1), value: z.string(), timeoutMs: z.number().int().positive().optional() }),
  z.object({
    type: z.literal("wait"),
    selector: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    loadState: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
    timeoutMs: z.number().int().positive().optional(),
  }),
  z.object({ type: z.literal("screenshot"), fullPage: z.boolean().optional(), timeoutMs: z.number().int().positive().optional() }),
  z.object({ type: z.literal("close"), timeoutMs: z.number().int().positive().optional() }),
]);

export const browserToolSchema = z.object({
  action: browserActionSchema,
});

export interface CreateBrowserToolInput {
  profile: BrowserProfile | undefined;
  sessions: BrowserSessionManager;
  artifactWriter?: BrowserArtifactWriter;
  now?: Date;
}

export function createBrowserTool(input: CreateBrowserToolInput): ToolFunction {
  return async (args: Record<string, unknown>): Promise<ToolResult> => {
    const parsed = browserToolSchema.safeParse(args);
    if (!parsed.success) {
      return { output: "", error: parsed.error.message };
    }

    if (input.profile === undefined) {
      return { output: "", error: "Browser tool is disabled" };
    }

    const result = await executeBrowserAction({
      action: parsed.data.action as BrowserAction,
      profile: input.profile,
      sessions: input.sessions,
      artifactWriter: input.artifactWriter,
      now: input.now,
    });

    return {
      output: JSON.stringify(result),
      error: result.safeError,
    };
  };
}
