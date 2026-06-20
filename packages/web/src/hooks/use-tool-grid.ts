import type { ToolGridSlice } from "../store/slices/tool-grid.slice";
import type { ToolCardData } from "../types/tool-grid";
import {
  ToolStartSchema,
  ToolOutputSchema,
  ToolCompleteSchema,
  ToolErrorSchema,
  type ToolStartEvent,
  type ToolOutputEvent,
  type ToolCompleteEvent,
  type ToolErrorEvent,
} from "../types/tool-events";

export interface ToolGridEventSubscriber {
  onToolStart(raw: unknown): void;
  onToolOutput(raw: unknown): void;
  onToolComplete(raw: unknown): void;
  onToolError(raw: unknown): void;
}

function safeParse<T>(
  schema: { safeParse(data: unknown): { success: boolean; data?: T; error?: { issues: unknown[] } } },
  raw: unknown,
  eventName: string,
): T | null {
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.warn(
      `[tool-grid] Invalid ${eventName} payload, skipping:`,
      raw,
      result.error?.issues,
    );
    return null;
  }
  return result.data as T;
}

export function createToolGridSubscriber(
  grid: ToolGridSlice,
): ToolGridEventSubscriber {
  return {
    onToolStart(raw: unknown) {
      const event = safeParse<ToolStartEvent>(ToolStartSchema, raw, "tool_start");
      if (!event) return;

      const data: ToolCardData = {
        toolId: event.toolCallId,
        toolName: event.toolName,
        parameters: { title: event.title },
        status: "running",
        progress: 0,
        startTime: event.timestamp,
        endTime: null,
        durationMs: null,
        outputPreview: [],
        fullOutput: "",
        error: null,
        isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      };
      grid.addTool(data);
    },

    onToolOutput(raw: unknown) {
      const event = safeParse<ToolOutputEvent>(ToolOutputSchema, raw, "tool_output");
      if (!event) return;

      const tool = grid.getTool(event.toolCallId);
      if (!tool) {
        console.warn(`[tool-grid] Received output for unknown tool: ${event.toolCallId}`);
        return;
      }
      grid.appendOutput(event.toolCallId, event.content);
    },

    onToolComplete(raw: unknown) {
      const event = safeParse<ToolCompleteEvent>(
        ToolCompleteSchema,
        raw,
        "tool_complete",
      );
      if (!event) return;

      if (event.status === "error") {
        grid.failTool(event.toolCallId, {
          message: event.errorMessage ?? "Unknown error",
          stack: event.stackTrace,
        });
      } else {
        grid.completeTool(event.toolCallId);
      }
    },

    onToolError(raw: unknown) {
      const event = safeParse<ToolErrorEvent>(ToolErrorSchema, raw, "tool_error");
      if (!event) return;

      grid.failTool(event.toolCallId, {
        message: event.message,
        stack: event.stackTrace,
      });
    },
  };
}
